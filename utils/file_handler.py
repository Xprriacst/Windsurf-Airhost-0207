"""
File handling utilities for file and directory analysis.
"""

import os
import mimetypes
from pathlib import Path
import chardet
import magic


class FileHandler:
    """Handles file operations and type detection."""
    
    def __init__(self):
        """Initialize the FileHandler."""
        # Initialize mimetypes
        mimetypes.init()
        
        # Try to use python-magic for better file type detection
        self.use_magic = True
        try:
            # Test if magic is available and working
            magic.Magic()
        except:
            self.use_magic = False
    
    def get_file_type(self, file_path):
        """
        Determine file type using multiple methods.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            dict: File type information
        """
        file_path = Path(file_path)
        
        result = {
            'extension': file_path.suffix.lower(),
            'mime_type': None,
            'category': 'unknown',
            'is_text': False,
            'is_binary': False
        }
        
        # Get MIME type using mimetypes
        mime_type, _ = mimetypes.guess_type(str(file_path))
        result['mime_type'] = mime_type
        
        # Use python-magic if available for better detection
        if self.use_magic and file_path.exists():
            try:
                mime = magic.Magic(mime=True)
                magic_mime = mime.from_file(str(file_path))
                if magic_mime:
                    result['mime_type'] = magic_mime
            except:
                pass
        
        # Categorize file
        result['category'] = self._categorize_file(result['extension'], result['mime_type'])
        
        # Determine if text or binary
        if result['mime_type']:
            result['is_text'] = result['mime_type'].startswith('text/')
            result['is_binary'] = not result['is_text']
        else:
            # Fallback: check by extension
            text_extensions = {
                '.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.xml',
                '.csv', '.sql', '.sh', '.bat', '.cfg', '.ini', '.log', '.yaml',
                '.yml', '.toml', '.conf', '.properties', '.gitignore', '.dockerfile'
            }
            result['is_text'] = result['extension'] in text_extensions
            result['is_binary'] = not result['is_text']
        
        return result
    
    def _categorize_file(self, extension, mime_type):
        """
        Categorize file based on extension and MIME type.
        
        Args:
            extension (str): File extension
            mime_type (str): MIME type
            
        Returns:
            str: File category
        """
        # Code files
        code_extensions = {
            '.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.cs', '.php',
            '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.sql',
            '.sh', '.bat', '.ps1', '.dockerfile'
        }
        
        # Document files
        document_extensions = {
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.odt', '.ods', '.odp', '.rtf'
        }
        
        # Image files
        image_extensions = {
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
            '.tiff', '.webp', '.raw'
        }
        
        # Audio files
        audio_extensions = {
            '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'
        }
        
        # Video files
        video_extensions = {
            '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'
        }
        
        # Archive files
        archive_extensions = {
            '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.jar'
        }
        
        # Configuration files
        config_extensions = {
            '.cfg', '.ini', '.conf', '.config', '.properties', '.toml',
            '.yaml', '.yml', '.json', '.xml'
        }
        
        if extension in code_extensions:
            return 'code'
        elif extension in document_extensions:
            return 'document'
        elif extension in image_extensions:
            return 'image'
        elif extension in audio_extensions:
            return 'audio'
        elif extension in video_extensions:
            return 'video'
        elif extension in archive_extensions:
            return 'archive'
        elif extension in config_extensions:
            return 'configuration'
        elif extension in {'.txt', '.md', '.log'}:
            return 'text'
        elif mime_type:
            if mime_type.startswith('text/'):
                return 'text'
            elif mime_type.startswith('image/'):
                return 'image'
            elif mime_type.startswith('audio/'):
                return 'audio'
            elif mime_type.startswith('video/'):
                return 'video'
            elif mime_type.startswith('application/'):
                return 'application'
        
        return 'unknown'
    
    def detect_encoding(self, file_path, sample_size=8192):
        """
        Detect file encoding for text files.
        
        Args:
            file_path (Path): Path to the file
            sample_size (int): Size of sample to read for detection
            
        Returns:
            str: Detected encoding or None
        """
        try:
            with open(file_path, 'rb') as f:
                sample = f.read(sample_size)
                if sample:
                    result = chardet.detect(sample)
                    return result.get('encoding')
        except Exception:
            pass
        return None
    
    def read_text_file(self, file_path, max_size=1024*1024):  # 1MB max
        """
        Safely read text file content.
        
        Args:
            file_path (Path): Path to the file
            max_size (int): Maximum file size to read
            
        Returns:
            dict: Content information
        """
        file_path = Path(file_path)
        
        result = {
            'content': None,
            'encoding': None,
            'lines': 0,
            'characters': 0,
            'words': 0,
            'error': None,
            'truncated': False
        }
        
        try:
            # Check file size
            file_size = file_path.stat().st_size
            if file_size > max_size:
                result['truncated'] = True
                result['error'] = f"File too large ({file_size} bytes), content truncated"
            
            # Detect encoding
            encoding = self.detect_encoding(file_path)
            if not encoding:
                encoding = 'utf-8'
            
            result['encoding'] = encoding
            
            # Read content
            with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                if result['truncated']:
                    content = f.read(max_size)
                else:
                    content = f.read()
            
            result['content'] = content
            
            # Calculate statistics
            if content:
                result['lines'] = content.count('\n') + 1
                result['characters'] = len(content)
                result['words'] = len(content.split())
        
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def is_readable(self, file_path):
        """
        Check if file is readable.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            bool: True if readable
        """
        try:
            return os.access(file_path, os.R_OK)
        except:
            return False
    
    def get_file_info(self, file_path):
        """
        Get basic file information.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            dict: File information
        """
        file_path = Path(file_path)
        
        info = {
            'name': file_path.name,
            'stem': file_path.stem,
            'suffix': file_path.suffix,
            'parent': str(file_path.parent),
            'is_readable': self.is_readable(file_path),
            'exists': file_path.exists()
        }
        
        return info
