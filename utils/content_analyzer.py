"""
Content analysis utilities for files.
"""

import re
from pathlib import Path
from collections import Counter
import json


class ContentAnalyzer:
    """Analyzes file content for various patterns and characteristics."""
    
    def __init__(self):
        """Initialize the ContentAnalyzer."""
        # Common patterns for analysis
        self.patterns = {
            'emails': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'urls': re.compile(r'https?://(?:[-\w.])+(?:[:\d]+)?(?:/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:\w*))?)?'),
            'ip_addresses': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
            'phone_numbers': re.compile(r'(\+\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}'),
            'dates': re.compile(r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b'),
            'credit_cards': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            'social_security': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
            'passwords': re.compile(r'(?i)(password|passwd|pwd)\s*[:=]\s*[^\s]+'),
            'api_keys': re.compile(r'(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*[\'"]?([a-zA-Z0-9_-]{16,})[\'"]?'),
            'sql_queries': re.compile(r'(?i)\b(select|insert|update|delete|create|drop|alter)\b.*\bfrom\b', re.MULTILINE),
        }
        
        # Security-related patterns
        self.security_patterns = {
            'potential_secrets': re.compile(r'(?i)(secret|password|key|token|auth|credential)'),
            'hardcoded_credentials': re.compile(r'(?i)(password|pwd|pass)\s*[:=]\s*[\'"][^\'"]{3,}[\'"]'),
            'sql_injection_risk': re.compile(r'(?i)(exec|execute|eval)\s*\(.*\$.*\)'),
            'xss_risk': re.compile(r'(?i)(innerHTML|outerHTML|document\.write)\s*\+|eval\s*\('),
        }
    
    def analyze(self, file_path):
        """
        Perform comprehensive content analysis on a file.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            dict: Analysis results
        """
        file_path = Path(file_path)
        
        analysis = {
            'file_type_analysis': {},
            'content_patterns': {},
            'security_analysis': {},
            'structure_analysis': {},
            'quality_metrics': {},
            'error': None
        }
        
        try:
            from utils.file_handler import FileHandler
            from utils.metadata_extractor import MetadataExtractor
            
            file_handler = FileHandler()
            metadata_extractor = MetadataExtractor()
            
            # Get file type information
            file_type_info = file_handler.get_file_type(file_path)
            analysis['file_type_analysis'] = file_type_info
            
            # Analyze based on file type
            if file_type_info['is_text']:
                content_info = file_handler.read_text_file(file_path)
                
                if content_info['content'] and not content_info['error']:
                    content = content_info['content']
                    
                    # Pattern analysis
                    analysis['content_patterns'] = self._analyze_patterns(content)
                    
                    # Security analysis
                    analysis['security_analysis'] = self._analyze_security(content, file_type_info)
                    
                    # Structure analysis
                    analysis['structure_analysis'] = self._analyze_structure(content, file_type_info)
                    
                    # Quality metrics
                    analysis['quality_metrics'] = self._analyze_quality(content, file_type_info)
                    
                else:
                    analysis['error'] = content_info.get('error', 'Could not read file content')
            
            else:
                # Binary file analysis
                analysis['content_patterns'] = {'file_type': 'binary', 'readable': False}
                
                # Extract extended metadata for specific binary types
                extended_metadata = metadata_extractor.extract_extended_metadata(file_path, file_type_info)
                if extended_metadata:
                    analysis['structure_analysis'] = extended_metadata
        
        except Exception as e:
            analysis['error'] = str(e)
        
        return analysis
    
    def _analyze_patterns(self, content):
        """
        Analyze content for various patterns.
        
        Args:
            content (str): File content
            
        Returns:
            dict: Pattern analysis results
        """
        results = {}
        
        for pattern_name, pattern in self.patterns.items():
            matches = pattern.findall(content)
            results[pattern_name] = {
                'count': len(matches),
                'unique_count': len(set(matches)) if matches else 0,
                'samples': list(set(matches))[:5] if matches else []  # First 5 unique matches
            }
        
        return results
    
    def _analyze_security(self, content, file_type_info):
        """
        Analyze content for security issues.
        
        Args:
            content (str): File content
            file_type_info (dict): File type information
            
        Returns:
            dict: Security analysis results
        """
        security_issues = []
        pattern_matches = {}
        
        # Check security patterns
        for pattern_name, pattern in self.security_patterns.items():
            matches = pattern.findall(content)
            if matches:
                pattern_matches[pattern_name] = len(matches)
                security_issues.append({
                    'type': pattern_name,
                    'severity': self._get_severity(pattern_name),
                    'count': len(matches),
                    'description': self._get_security_description(pattern_name)
                })
        
        # File-type specific security checks
        if file_type_info['category'] == 'code':
            extension = file_type_info['extension']
            
            # Check for specific vulnerabilities by language
            if extension == '.py':
                security_issues.extend(self._check_python_security(content))
            elif extension in ['.js', '.ts']:
                security_issues.extend(self._check_javascript_security(content))
            elif extension in ['.sql']:
                security_issues.extend(self._check_sql_security(content))
        
        return {
            'issues_found': len(security_issues),
            'issues': security_issues,
            'pattern_matches': pattern_matches,
            'risk_level': self._calculate_risk_level(security_issues)
        }
    
    def _analyze_structure(self, content, file_type_info):
        """
        Analyze content structure.
        
        Args:
            content (str): File content
            file_type_info (dict): File type information
            
        Returns:
            dict: Structure analysis results
        """
        structure = {
            'line_count': content.count('\n') + 1,
            'character_count': len(content),
            'word_count': len(content.split()),
            'paragraph_count': len([p for p in content.split('\n\n') if p.strip()]),
            'average_line_length': 0,
            'longest_line_length': 0,
            'indentation_style': None,
            'line_ending_style': None
        }
        
        lines = content.split('\n')
        
        if lines:
            line_lengths = [len(line) for line in lines]
            structure['average_line_length'] = sum(line_lengths) / len(line_lengths)
            structure['longest_line_length'] = max(line_lengths)
        
        # Detect indentation style
        structure['indentation_style'] = self._detect_indentation(lines)
        
        # Detect line ending style
        structure['line_ending_style'] = self._detect_line_endings(content)
        
        # File-type specific structure analysis
        if file_type_info['category'] == 'code':
            structure.update(self._analyze_code_structure(content, file_type_info))
        elif file_type_info['extension'] == '.json':
            structure.update(self._analyze_json_structure(content))
        elif file_type_info['extension'] in ['.xml', '.html']:
            structure.update(self._analyze_markup_structure(content))
        
        return structure
    
    def _analyze_quality(self, content, file_type_info):
        """
        Analyze content quality metrics.
        
        Args:
            content (str): File content
            file_type_info (dict): File type information
            
        Returns:
            dict: Quality metrics
        """
        quality = {
            'readability_score': 0,
            'complexity_indicators': {},
            'consistency_metrics': {},
            'best_practices': {}
        }
        
        # General quality metrics
        lines = content.split('\n')
        
        # Calculate complexity indicators
        quality['complexity_indicators'] = {
            'nested_structures': self._count_nested_structures(content),
            'long_lines': sum(1 for line in lines if len(line) > 100),
            'very_long_lines': sum(1 for line in lines if len(line) > 150),
            'empty_lines_ratio': sum(1 for line in lines if not line.strip()) / len(lines) if lines else 0
        }
        
        # File-type specific quality analysis
        if file_type_info['category'] == 'code':
            quality['best_practices'] = self._analyze_code_quality(content, file_type_info)
        
        return quality
    
    def _detect_indentation(self, lines):
        """Detect indentation style from lines."""
        indentations = []
        
        for line in lines:
            if line.strip():  # Skip empty lines
                leading_spaces = len(line) - len(line.lstrip(' '))
                leading_tabs = len(line) - len(line.lstrip('\t'))
                
                if leading_tabs > 0:
                    indentations.append('tabs')
                elif leading_spaces > 0:
                    indentations.append('spaces')
        
        if not indentations:
            return 'none'
        
        # Determine most common indentation
        indent_counter = Counter(indentations)
        most_common = indent_counter.most_common(1)[0][0]
        
        return most_common
    
    def _detect_line_endings(self, content):
        """Detect line ending style."""
        if '\r\n' in content:
            return 'CRLF (Windows)'
        elif '\r' in content:
            return 'CR (Mac Classic)'
        elif '\n' in content:
            return 'LF (Unix/Linux/Mac)'
        else:
            return 'none'
    
    def _analyze_code_structure(self, content, file_type_info):
        """Analyze code-specific structure."""
        structure = {}
        
        extension = file_type_info['extension']
        
        # Function/method counting
        if extension == '.py':
            structure['functions'] = len(re.findall(r'^\s*def\s+\w+', content, re.MULTILINE))
            structure['classes'] = len(re.findall(r'^\s*class\s+\w+', content, re.MULTILINE))
            structure['imports'] = len(re.findall(r'^\s*(import|from)\s+', content, re.MULTILINE))
        elif extension in ['.js', '.ts']:
            structure['functions'] = len(re.findall(r'function\s+\w+|=>\s*{|:\s*function', content))
            structure['classes'] = len(re.findall(r'class\s+\w+', content))
            structure['imports'] = len(re.findall(r'^\s*(import|require)\s*\(', content, re.MULTILINE))
        elif extension == '.java':
            structure['classes'] = len(re.findall(r'class\s+\w+', content))
            structure['methods'] = len(re.findall(r'(public|private|protected)\s+.*\s+\w+\s*\(', content))
            structure['imports'] = len(re.findall(r'^\s*import\s+', content, re.MULTILINE))
        
        return structure
    
    def _analyze_json_structure(self, content):
        """Analyze JSON structure."""
        structure = {}
        
        try:
            data = json.loads(content)
            structure['valid_json'] = True
            structure['data_type'] = type(data).__name__
            
            if isinstance(data, dict):
                structure['top_level_keys'] = len(data.keys())
                structure['nested_levels'] = self._get_json_depth(data)
            elif isinstance(data, list):
                structure['array_length'] = len(data)
                if data:
                    structure['nested_levels'] = self._get_json_depth(data[0]) if data else 0
        except json.JSONDecodeError as e:
            structure['valid_json'] = False
            structure['json_error'] = str(e)
        
        return structure
    
    def _analyze_markup_structure(self, content):
        """Analyze HTML/XML structure."""
        structure = {}
        
        # Count tags
        tags = re.findall(r'<(\w+)', content)
        structure['total_tags'] = len(tags)
        structure['unique_tags'] = len(set(tags))
        structure['tag_distribution'] = dict(Counter(tags).most_common(10))
        
        # Check for common issues
        structure['unclosed_tags'] = self._find_unclosed_tags(content)
        
        return structure
    
    def _count_nested_structures(self, content):
        """Count nested structures like brackets, braces, etc."""
        nesting_chars = {'(': ')', '[': ']', '{': '}'}
        max_depth = 0
        current_depth = 0
        
        for char in content:
            if char in nesting_chars.keys():
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char in nesting_chars.values():
                current_depth = max(0, current_depth - 1)
        
        return max_depth
    
    def _analyze_code_quality(self, content, file_type_info):
        """Analyze code quality indicators."""
        quality = {}
        
        extension = file_type_info['extension']
        lines = content.split('\n')
        
        # Common code quality metrics
        quality['has_comments'] = any('#' in line or '//' in line or '/*' in content for line in lines)
        quality['has_docstrings'] = '"""' in content or "'''" in content
        quality['long_functions'] = self._detect_long_functions(content, extension)
        
        # Language-specific quality checks
        if extension == '.py':
            quality.update(self._python_quality_checks(content))
        elif extension in ['.js', '.ts']:
            quality.update(self._javascript_quality_checks(content))
        
        return quality
    
    def _check_python_security(self, content):
        """Check for Python-specific security issues."""
        issues = []
        
        # Check for dangerous functions
        dangerous_functions = ['eval', 'exec', 'compile', '__import__']
        for func in dangerous_functions:
            if f'{func}(' in content:
                issues.append({
                    'type': f'dangerous_function_{func}',
                    'severity': 'high',
                    'count': content.count(f'{func}('),
                    'description': f'Use of potentially dangerous function: {func}'
                })
        
        # Check for pickle usage (can be dangerous)
        if 'pickle.load' in content or 'pickle.loads' in content:
            issues.append({
                'type': 'pickle_usage',
                'severity': 'medium',
                'count': content.count('pickle.load'),
                'description': 'Pickle deserialization can be dangerous with untrusted data'
            })
        
        return issues
    
    def _check_javascript_security(self, content):
        """Check for JavaScript-specific security issues."""
        issues = []
        
        # Check for dangerous functions
        if 'eval(' in content:
            issues.append({
                'type': 'eval_usage',
                'severity': 'high',
                'count': content.count('eval('),
                'description': 'Use of eval() can lead to code injection vulnerabilities'
            })
        
        # Check for innerHTML usage
        if 'innerHTML' in content:
            issues.append({
                'type': 'innerHTML_usage',
                'severity': 'medium',
                'count': content.count('innerHTML'),
                'description': 'innerHTML usage may lead to XSS vulnerabilities'
            })
        
        return issues
    
    def _check_sql_security(self, content):
        """Check for SQL-specific security issues."""
        issues = []
        
        # Check for potential SQL injection patterns
        if re.search(r'SELECT.*\+.*FROM', content, re.IGNORECASE):
            issues.append({
                'type': 'sql_injection_risk',
                'severity': 'high',
                'count': 1,
                'description': 'Potential SQL injection vulnerability through string concatenation'
            })
        
        return issues
    
    def _get_severity(self, pattern_name):
        """Get severity level for security pattern."""
        high_severity = ['hardcoded_credentials', 'sql_injection_risk', 'xss_risk']
        medium_severity = ['potential_secrets', 'api_keys']
        
        if pattern_name in high_severity:
            return 'high'
        elif pattern_name in medium_severity:
            return 'medium'
        else:
            return 'low'
    
    def _get_security_description(self, pattern_name):
        """Get description for security pattern."""
        descriptions = {
            'potential_secrets': 'Potential secrets or sensitive information found',
            'hardcoded_credentials': 'Hardcoded credentials detected',
            'sql_injection_risk': 'Potential SQL injection vulnerability',
            'xss_risk': 'Potential XSS vulnerability'
        }
        return descriptions.get(pattern_name, 'Security pattern detected')
    
    def _calculate_risk_level(self, security_issues):
        """Calculate overall risk level."""
        if not security_issues:
            return 'low'
        
        severity_counts = Counter(issue['severity'] for issue in security_issues)
        
        if severity_counts['high'] > 0:
            return 'high'
        elif severity_counts['medium'] > 2:
            return 'high'
        elif severity_counts['medium'] > 0:
            return 'medium'
        else:
            return 'low'
    
    def _get_json_depth(self, obj, depth=0):
        """Calculate JSON nesting depth."""
        if isinstance(obj, dict):
            return max([self._get_json_depth(value, depth + 1) for value in obj.values()], default=depth)
        elif isinstance(obj, list):
            return max([self._get_json_depth(item, depth + 1) for item in obj], default=depth)
        else:
            return depth
    
    def _find_unclosed_tags(self, content):
        """Find potentially unclosed HTML/XML tags."""
        # Simplified check for unclosed tags
        opening_tags = re.findall(r'<(\w+)(?:\s+[^>]*)?>', content)
        closing_tags = re.findall(r'</(\w+)>', content)
        
        opening_count = Counter(opening_tags)
        closing_count = Counter(closing_tags)
        
        unclosed = {}
        for tag, count in opening_count.items():
            if closing_count[tag] < count:
                unclosed[tag] = count - closing_count[tag]
        
        return unclosed
    
    def _detect_long_functions(self, content, extension):
        """Detect long functions (basic implementation)."""
        long_functions = 0
        
        if extension == '.py':
            # Simple detection of Python functions
            function_starts = [(m.start(), m.group(1)) for m in re.finditer(r'^\s*def\s+(\w+)', content, re.MULTILINE)]
            
            for i, (start, name) in enumerate(function_starts):
                # Find end of function (next function or end of file)
                if i + 1 < len(function_starts):
                    end = function_starts[i + 1][0]
                else:
                    end = len(content)
                
                function_content = content[start:end]
                function_lines = function_content.count('\n')
                
                if function_lines > 50:  # Arbitrary threshold
                    long_functions += 1
        
        return long_functions
    
    def _python_quality_checks(self, content):
        """Python-specific quality checks."""
        quality = {}
        
        # Check for PEP 8 compliance indicators
        quality['has_main_guard'] = 'if __name__ == "__main__"' in content
        quality['imports_at_top'] = self._check_imports_at_top(content)
        quality['line_length_compliance'] = self._check_line_length(content, 79)
        
        return quality
    
    def _javascript_quality_checks(self, content):
        """JavaScript-specific quality checks."""
        quality = {}
        
        # Check for modern JavaScript practices
        quality['uses_const_let'] = 'const ' in content or 'let ' in content
        quality['uses_arrow_functions'] = '=>' in content
        quality['uses_strict_mode'] = "'use strict'" in content or '"use strict"' in content
        
        return quality
    
    def _check_imports_at_top(self, content):
        """Check if imports are at the top of Python file."""
        lines = content.split('\n')
        code_started = False
        
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
            
            if stripped.startswith(('import ', 'from ')):
                if code_started:
                    return False
            else:
                code_started = True
        
        return True
    
    def _check_line_length(self, content, max_length):
        """Check line length compliance."""
        lines = content.split('\n')
        long_lines = sum(1 for line in lines if len(line) > max_length)
        return long_lines == 0
