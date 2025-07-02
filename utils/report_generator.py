"""
Report generation utilities for file analysis results.
"""

import json
import csv
import io
from datetime import datetime
from collections import Counter, defaultdict
from pathlib import Path


class ReportGenerator:
    """Generates various types of reports from analysis results."""
    
    def __init__(self):
        """Initialize the ReportGenerator."""
        pass
    
    def generate_statistics(self, analysis_results):
        """
        Generate comprehensive statistics from analysis results.
        
        Args:
            analysis_results (dict): Analysis results
            
        Returns:
            dict: Statistics
        """
        stats = {
            'overview': {},
            'file_types': {},
            'size_distribution': {},
            'security_summary': {},
            'quality_summary': {},
            'content_patterns': {},
            'timestamps': {}
        }
        
        files = analysis_results.get('file_analysis', [])
        
        if not files:
            return stats
        
        # Overview statistics
        stats['overview'] = self._generate_overview_stats(files, analysis_results)
        
        # File type statistics
        stats['file_types'] = self._generate_file_type_stats(files)
        
        # Size distribution
        stats['size_distribution'] = self._generate_size_stats(files)
        
        # Security summary
        stats['security_summary'] = self._generate_security_stats(files)
        
        # Quality summary
        stats['quality_summary'] = self._generate_quality_stats(files)
        
        # Content patterns
        stats['content_patterns'] = self._generate_pattern_stats(files)
        
        # Timestamp analysis
        stats['timestamps'] = self._generate_timestamp_stats(files)
        
        return stats
    
    def _generate_overview_stats(self, files, analysis_results):
        """Generate overview statistics."""
        total_files = len(files)
        total_size = sum(f.get('metadata', {}).get('size', 0) for f in files)
        
        text_files = sum(1 for f in files if f.get('content_analysis', {}).get('file_type_analysis', {}).get('is_text', False))
        binary_files = total_files - text_files
        
        readable_files = sum(1 for f in files if not f.get('content_analysis', {}).get('error'))
        
        scan_info = analysis_results.get('scan_info', {})
        
        return {
            'total_files': total_files,
            'text_files': text_files,
            'binary_files': binary_files,
            'readable_files': readable_files,
            'unreadable_files': total_files - readable_files,
            'total_size': total_size,
            'total_size_formatted': self._format_size(total_size),
            'average_file_size': total_size / total_files if total_files > 0 else 0,
            'scan_duration': scan_info.get('scan_duration', 0),
            'errors_count': len(analysis_results.get('errors', []))
        }
    
    def _generate_file_type_stats(self, files):
        """Generate file type statistics."""
        extensions = []
        categories = []
        mime_types = []
        
        for file_data in files:
            metadata = file_data.get('metadata', {})
            content_analysis = file_data.get('content_analysis', {})
            file_type_analysis = content_analysis.get('file_type_analysis', {})
            
            extensions.append(metadata.get('suffix', '').lower())
            categories.append(file_type_analysis.get('category', 'unknown'))
            mime_types.append(file_type_analysis.get('mime_type', 'unknown'))
        
        return {
            'by_extension': dict(Counter(extensions).most_common()),
            'by_category': dict(Counter(categories).most_common()),
            'by_mime_type': dict(Counter(mime_types).most_common()),
            'unique_extensions': len(set(extensions)),
            'unique_categories': len(set(categories)),
            'unique_mime_types': len(set(mime_types))
        }
    
    def _generate_size_stats(self, files):
        """Generate file size statistics."""
        sizes = [f.get('metadata', {}).get('size', 0) for f in files]
        
        if not sizes:
            return {}
        
        sizes.sort()
        
        # Size categories
        size_categories = {
            'tiny': sum(1 for s in sizes if s < 1024),  # < 1KB
            'small': sum(1 for s in sizes if 1024 <= s < 10240),  # 1KB - 10KB
            'medium': sum(1 for s in sizes if 10240 <= s < 102400),  # 10KB - 100KB
            'large': sum(1 for s in sizes if 102400 <= s < 1048576),  # 100KB - 1MB
            'very_large': sum(1 for s in sizes if s >= 1048576)  # >= 1MB
        }
        
        return {
            'total_size': sum(sizes),
            'average_size': sum(sizes) / len(sizes),
            'median_size': sizes[len(sizes) // 2],
            'min_size': min(sizes),
            'max_size': max(sizes),
            'size_categories': size_categories,
            'largest_files': self._get_largest_files(files, 5),
            'size_distribution': self._get_size_distribution(sizes)
        }
    
    def _generate_security_stats(self, files):
        """Generate security statistics."""
        total_issues = 0
        risk_levels = []
        issue_types = []
        files_with_issues = 0
        
        for file_data in files:
            security_analysis = file_data.get('content_analysis', {}).get('security_analysis', {})
            
            if security_analysis:
                issues_count = security_analysis.get('issues_found', 0)
                total_issues += issues_count
                
                if issues_count > 0:
                    files_with_issues += 1
                    risk_levels.append(security_analysis.get('risk_level', 'low'))
                    
                    for issue in security_analysis.get('issues', []):
                        issue_types.append(issue.get('type', 'unknown'))
        
        return {
            'total_security_issues': total_issues,
            'files_with_security_issues': files_with_issues,
            'security_issue_rate': files_with_issues / len(files) if files else 0,
            'risk_level_distribution': dict(Counter(risk_levels)),
            'issue_type_distribution': dict(Counter(issue_types).most_common()),
            'high_risk_files': sum(1 for level in risk_levels if level == 'high')
        }
    
    def _generate_quality_stats(self, files):
        """Generate quality statistics."""
        quality_metrics = defaultdict(list)
        
        for file_data in files:
            quality_analysis = file_data.get('content_analysis', {}).get('quality_metrics', {})
            
            if quality_analysis:
                complexity = quality_analysis.get('complexity_indicators', {})
                
                for metric, value in complexity.items():
                    if isinstance(value, (int, float)):
                        quality_metrics[metric].append(value)
        
        # Calculate averages
        average_metrics = {}
        for metric, values in quality_metrics.items():
            if values:
                average_metrics[f'average_{metric}'] = sum(values) / len(values)
                average_metrics[f'max_{metric}'] = max(values)
        
        return {
            'files_analyzed_for_quality': len([f for f in files if f.get('content_analysis', {}).get('quality_metrics')]),
            'average_metrics': average_metrics,
            'code_files_with_comments': self._count_files_with_comments(files),
            'code_files_with_docstrings': self._count_files_with_docstrings(files)
        }
    
    def _generate_pattern_stats(self, files):
        """Generate content pattern statistics."""
        pattern_totals = defaultdict(int)
        pattern_files = defaultdict(int)
        
        for file_data in files:
            patterns = file_data.get('content_analysis', {}).get('content_patterns', {})
            
            for pattern_name, pattern_data in patterns.items():
                if isinstance(pattern_data, dict) and 'count' in pattern_data:
                    count = pattern_data['count']
                    pattern_totals[pattern_name] += count
                    if count > 0:
                        pattern_files[pattern_name] += 1
        
        return {
            'pattern_totals': dict(pattern_totals),
            'files_with_patterns': dict(pattern_files),
            'most_common_patterns': dict(Counter(pattern_totals).most_common(10))
        }
    
    def _generate_timestamp_stats(self, files):
        """Generate timestamp statistics."""
        created_dates = []
        modified_dates = []
        
        for file_data in files:
            metadata = file_data.get('metadata', {})
            
            if metadata.get('created'):
                try:
                    created_dates.append(datetime.fromisoformat(metadata['created'].replace('Z', '+00:00')))
                except:
                    pass
            
            if metadata.get('modified'):
                try:
                    modified_dates.append(datetime.fromisoformat(metadata['modified'].replace('Z', '+00:00')))
                except:
                    pass
        
        stats = {}
        
        if created_dates:
            created_dates.sort()
            stats['oldest_file'] = created_dates[0].isoformat()
            stats['newest_file'] = created_dates[-1].isoformat()
        
        if modified_dates:
            modified_dates.sort()
            stats['oldest_modification'] = modified_dates[0].isoformat()
            stats['newest_modification'] = modified_dates[-1].isoformat()
            
            # Modification activity by year/month
            modification_years = [d.year for d in modified_dates]
            modification_months = [f"{d.year}-{d.month:02d}" for d in modified_dates]
            
            stats['modification_by_year'] = dict(Counter(modification_years))
            stats['modification_by_month'] = dict(Counter(modification_months).most_common(12))
        
        return stats
    
    def save_report(self, analysis_results, output_file, format_type='json'):
        """
        Save analysis results to file in specified format.
        
        Args:
            analysis_results (dict): Analysis results
            output_file (str): Output file path
            format_type (str): Output format ('json', 'csv', 'txt')
        """
        output_path = Path(output_file)
        
        if format_type == 'json':
            self._save_json_report(analysis_results, output_path)
        elif format_type == 'csv':
            self._save_csv_report(analysis_results, output_path)
        elif format_type == 'txt':
            self._save_text_report(analysis_results, output_path)
        else:
            raise ValueError(f"Unsupported format: {format_type}")
    
    def _save_json_report(self, analysis_results, output_path):
        """Save report as JSON."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_results, f, indent=2, default=str, ensure_ascii=False)
    
    def _save_csv_report(self, analysis_results, output_path):
        """Save report as CSV."""
        files = analysis_results.get('file_analysis', [])
        
        if not files:
            return
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = [
                'path', 'size', 'extension', 'category', 'mime_type',
                'created', 'modified', 'is_text', 'is_binary',
                'security_issues', 'risk_level', 'readable'
            ]
            
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for file_data in files:
                metadata = file_data.get('metadata', {})
                content_analysis = file_data.get('content_analysis', {})
                file_type_analysis = content_analysis.get('file_type_analysis', {})
                security_analysis = content_analysis.get('security_analysis', {})
                
                row = {
                    'path': file_data.get('path', ''),
                    'size': metadata.get('size', 0),
                    'extension': metadata.get('suffix', ''),
                    'category': file_type_analysis.get('category', ''),
                    'mime_type': file_type_analysis.get('mime_type', ''),
                    'created': metadata.get('created', ''),
                    'modified': metadata.get('modified', ''),
                    'is_text': file_type_analysis.get('is_text', False),
                    'is_binary': file_type_analysis.get('is_binary', False),
                    'security_issues': security_analysis.get('issues_found', 0),
                    'risk_level': security_analysis.get('risk_level', ''),
                    'readable': not bool(content_analysis.get('error'))
                }
                
                writer.writerow(row)
    
    def _save_text_report(self, analysis_results, output_path):
        """Save report as formatted text."""
        with open(output_path, 'w', encoding='utf-8') as f:
            # Write header
            f.write("FILE ANALYSIS REPORT\n")
            f.write("=" * 60 + "\n\n")
            
            # Write scan information
            scan_info = analysis_results.get('scan_info', {})
            f.write("SCAN INFORMATION\n")
            f.write("-" * 30 + "\n")
            f.write(f"Target Path: {scan_info.get('target_path', 'N/A')}\n")
            f.write(f"Scan Started: {scan_info.get('scan_started', 'N/A')}\n")
            f.write(f"Scan Completed: {scan_info.get('scan_completed', 'N/A')}\n")
            f.write(f"Duration: {scan_info.get('scan_duration', 0):.2f} seconds\n")
            f.write(f"Total Files: {scan_info.get('total_files', 0)}\n")
            f.write(f"Total Directories: {scan_info.get('total_directories', 0)}\n")
            f.write(f"Total Size: {self._format_size(scan_info.get('total_size', 0))}\n\n")
            
            # Write statistics
            stats = analysis_results.get('statistics', {})
            if stats:
                f.write("STATISTICS SUMMARY\n")
                f.write("-" * 30 + "\n")
                
                # Overview
                overview = stats.get('overview', {})
                if overview:
                    f.write(f"Text Files: {overview.get('text_files', 0)}\n")
                    f.write(f"Binary Files: {overview.get('binary_files', 0)}\n")
                    f.write(f"Readable Files: {overview.get('readable_files', 0)}\n")
                    f.write(f"Unreadable Files: {overview.get('unreadable_files', 0)}\n")
                    f.write(f"Average File Size: {self._format_size(overview.get('average_file_size', 0))}\n\n")
                
                # File types
                file_types = stats.get('file_types', {})
                if file_types.get('by_extension'):
                    f.write("TOP FILE TYPES BY EXTENSION\n")
                    f.write("-" * 30 + "\n")
                    for ext, count in list(file_types['by_extension'].items())[:10]:
                        f.write(f"{ext or '(no extension)'}: {count} files\n")
                    f.write("\n")
                
                # Security summary
                security = stats.get('security_summary', {})
                if security:
                    f.write("SECURITY SUMMARY\n")
                    f.write("-" * 30 + "\n")
                    f.write(f"Total Security Issues: {security.get('total_security_issues', 0)}\n")
                    f.write(f"Files with Issues: {security.get('files_with_security_issues', 0)}\n")
                    f.write(f"High Risk Files: {security.get('high_risk_files', 0)}\n\n")
            
            # Write errors if any
            errors = analysis_results.get('errors', [])
            if errors:
                f.write("ERRORS ENCOUNTERED\n")
                f.write("-" * 30 + "\n")
                for error in errors[:10]:  # Show first 10 errors
                    f.write(f"Type: {error.get('type', 'Unknown')}\n")
                    f.write(f"Message: {error.get('message', 'No message')}\n")
                    f.write(f"Path: {error.get('path', 'N/A')}\n")
                    f.write(f"Time: {error.get('timestamp', 'N/A')}\n")
                    f.write("-" * 20 + "\n")
                
                if len(errors) > 10:
                    f.write(f"... and {len(errors) - 10} more errors\n")
    
    def _format_size(self, size_bytes):
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"
    
    def _get_largest_files(self, files, count=5):
        """Get largest files."""
        sorted_files = sorted(
            files,
            key=lambda f: f.get('metadata', {}).get('size', 0),
            reverse=True
        )
        
        return [
            {
                'path': f.get('path', ''),
                'size': f.get('metadata', {}).get('size', 0),
                'size_formatted': self._format_size(f.get('metadata', {}).get('size', 0))
            }
            for f in sorted_files[:count]
        ]
    
    def _get_size_distribution(self, sizes):
        """Get size distribution percentiles."""
        if not sizes:
            return {}
        
        sorted_sizes = sorted(sizes)
        length = len(sorted_sizes)
        
        percentiles = {}
        for p in [10, 25, 50, 75, 90, 95, 99]:
            index = int(length * p / 100)
            if index >= length:
                index = length - 1
            percentiles[f'p{p}'] = sorted_sizes[index]
        
        return percentiles
    
    def _count_files_with_comments(self, files):
        """Count code files that have comments."""
        count = 0
        
        for file_data in files:
            content_analysis = file_data.get('content_analysis', {})
            file_type_analysis = content_analysis.get('file_type_analysis', {})
            quality_metrics = content_analysis.get('quality_metrics', {})
            
            if (file_type_analysis.get('category') == 'code' and
                quality_metrics.get('best_practices', {}).get('has_comments')):
                count += 1
        
        return count
    
    def _count_files_with_docstrings(self, files):
        """Count code files that have docstrings."""
        count = 0
        
        for file_data in files:
            content_analysis = file_data.get('content_analysis', {})
            file_type_analysis = content_analysis.get('file_type_analysis', {})
            quality_metrics = content_analysis.get('quality_metrics', {})
            
            if (file_type_analysis.get('category') == 'code' and
                quality_metrics.get('best_practices', {}).get('has_docstrings')):
                count += 1
        
        return count
