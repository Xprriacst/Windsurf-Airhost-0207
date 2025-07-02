"""
Metadata extraction utilities for files.
"""

import os
import stat
from pathlib import Path
from datetime import datetime
import hashlib


class MetadataExtractor:
    """Extracts metadata from files."""
    
    def __init__(self):
        """Initialize the MetadataExtractor."""
        pass
    
    def extract(self, file_path):
        """
        Extract comprehensive metadata from a file.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            dict: File metadata
        """
        file_path = Path(file_path)
        
        metadata = {
            'name': file_path.name,
            'stem': file_path.stem,
            'suffix': file_path.suffix.lower(),
            'size': 0,
            'created': None,
            'modified': None,
            'accessed': None,
            'permissions': {},
            'owner': {},
            'checksums': {},
            'error': None
        }
        
        try:
            # Get file stats
            file_stats = file_path.stat()
            
            # Basic information
            metadata['size'] = file_stats.st_size
            metadata['created'] = datetime.fromtimestamp(file_stats.st_ctime).isoformat()
            metadata['modified'] = datetime.fromtimestamp(file_stats.st_mtime).isoformat()
            metadata['accessed'] = datetime.fromtimestamp(file_stats.st_atime).isoformat()
            
            # Permissions
            metadata['permissions'] = self._extract_permissions(file_stats)
            
            # Owner information (Unix-like systems)
            metadata['owner'] = self._extract_owner_info(file_stats)
            
            # Calculate checksums for smaller files
            if metadata['size'] <= 10 * 1024 * 1024:  # 10MB limit
                metadata['checksums'] = self._calculate_checksums(file_path)
            
        except Exception as e:
            metadata['error'] = str(e)
        
        return metadata
    
    def _extract_permissions(self, file_stats):
        """
        Extract file permissions information.
        
        Args:
            file_stats: File stats object
            
        Returns:
            dict: Permissions information
        """
        mode = file_stats.st_mode
        
        permissions = {
            'octal': oct(stat.S_IMODE(mode)),
            'readable': bool(mode & stat.S_IRUSR),
            'writable': bool(mode & stat.S_IWUSR),
            'executable': bool(mode & stat.S_IXUSR),
            'is_file': stat.S_ISREG(mode),
            'is_directory': stat.S_ISDIR(mode),
            'is_link': stat.S_ISLNK(mode),
            'permissions_string': self._mode_to_string(mode)
        }
        
        return permissions
    
    def _mode_to_string(self, mode):
        """
        Convert file mode to permission string (like ls -l).
        
        Args:
            mode: File mode
            
        Returns:
            str: Permission string
        """
        permissions = ""
        
        # File type
        if stat.S_ISDIR(mode):
            permissions += "d"
        elif stat.S_ISLNK(mode):
            permissions += "l"
        elif stat.S_ISREG(mode):
            permissions += "-"
        else:
            permissions += "?"
        
        # Owner permissions
        permissions += "r" if mode & stat.S_IRUSR else "-"
        permissions += "w" if mode & stat.S_IWUSR else "-"
        permissions += "x" if mode & stat.S_IXUSR else "-"
        
        # Group permissions
        permissions += "r" if mode & stat.S_IRGRP else "-"
        permissions += "w" if mode & stat.S_IWGRP else "-"
        permissions += "x" if mode & stat.S_IXGRP else "-"
        
        # Other permissions
        permissions += "r" if mode & stat.S_IROTH else "-"
        permissions += "w" if mode & stat.S_IWOTH else "-"
        permissions += "x" if mode & stat.S_IXOTH else "-"
        
        return permissions
    
    def _extract_owner_info(self, file_stats):
        """
        Extract file owner information.
        
        Args:
            file_stats: File stats object
            
        Returns:
            dict: Owner information
        """
        owner_info = {
            'uid': file_stats.st_uid,
            'gid': file_stats.st_gid,
            'username': None,
            'groupname': None
        }
        
        # Try to get username and group name (Unix-like systems)
        try:
            import pwd
            import grp
            
            owner_info['username'] = pwd.getpwuid(file_stats.st_uid).pw_name
            owner_info['groupname'] = grp.getgrgid(file_stats.st_gid).gr_name
        except (ImportError, KeyError, OSError):
            # Not available on Windows or user/group not found
            pass
        
        return owner_info
    
    def _calculate_checksums(self, file_path):
        """
        Calculate file checksums.
        
        Args:
            file_path (Path): Path to the file
            
        Returns:
            dict: Checksums
        """
        checksums = {
            'md5': None,
            'sha1': None,
            'sha256': None,
            'error': None
        }
        
        try:
            # Initialize hash objects
            md5_hash = hashlib.md5()
            sha1_hash = hashlib.sha1()
            sha256_hash = hashlib.sha256()
            
            # Read file in chunks to handle large files
            with open(file_path, 'rb') as f:
                while chunk := f.read(8192):
                    md5_hash.update(chunk)
                    sha1_hash.update(chunk)
                    sha256_hash.update(chunk)
            
            checksums['md5'] = md5_hash.hexdigest()
            checksums['sha1'] = sha1_hash.hexdigest()
            checksums['sha256'] = sha256_hash.hexdigest()
            
        except Exception as e:
            checksums['error'] = str(e)
        
        return checksums
    
    def extract_extended_metadata(self, file_path, file_type_info):
        """
        Extract extended metadata based on file type.
        
        Args:
            file_path (Path): Path to the file
            file_type_info (dict): File type information
            
        Returns:
            dict: Extended metadata
        """
        extended = {}
        
        try:
            category = file_type_info.get('category', '')
            
            if category == 'image':
                extended = self._extract_image_metadata(file_path)
            elif category == 'code':
                extended = self._extract_code_metadata(file_path)
            elif category == 'text':
                extended = self._extract_text_metadata(file_path)
            elif category == 'archive':
                extended = self._extract_archive_metadata(file_path)
                
        except Exception as e:
            extended['extraction_error'] = str(e)
        
        return extended
    
    def _extract_image_metadata(self, file_path):
        """Extract metadata from image files."""
        metadata = {}
        
        try:
            # Try to use Pillow if available
            from PIL import Image
            from PIL.ExifTags import TAGS
            
            with Image.open(file_path) as img:
                metadata['width'] = img.width
                metadata['height'] = img.height
                metadata['format'] = img.format
                metadata['mode'] = img.mode
                
                # Extract EXIF data
                exif_data = img.getexif()
                if exif_data:
                    exif = {}
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        exif[tag] = str(value)
                    metadata['exif'] = exif
                    
        except ImportError:
            metadata['error'] = "PIL/Pillow not available for image metadata extraction"
        except Exception as e:
            metadata['error'] = str(e)
        
        return metadata
    
    def _extract_code_metadata(self, file_path):
        """Extract metadata from code files."""
        metadata = {}
        
        try:
            from utils.file_handler import FileHandler
            file_handler = FileHandler()
            
            # Read file content if it's text
            file_type = file_handler.get_file_type(file_path)
            if file_type['is_text']:
                content_info = file_handler.read_text_file(file_path)
                
                if content_info['content'] and not content_info['error']:
                    content = content_info['content']
                    
                    # Basic code metrics
                    metadata['lines_of_code'] = content_info['lines']
                    metadata['characters'] = content_info['characters']
                    metadata['words'] = content_info['words']
                    
                    # Count different types of lines
                    lines = content.split('\n')
                    metadata['blank_lines'] = sum(1 for line in lines if not line.strip())
                    metadata['comment_lines'] = self._count_comment_lines(lines, file_path.suffix)
                    metadata['code_lines'] = metadata['lines_of_code'] - metadata['blank_lines'] - metadata['comment_lines']
                    
                    # Programming language specific analysis
                    metadata['language'] = self._detect_programming_language(file_path.suffix)
                    
        except Exception as e:
            metadata['error'] = str(e)
        
        return metadata
    
    def _extract_text_metadata(self, file_path):
        """Extract metadata from text files."""
        metadata = {}
        
        try:
            from utils.file_handler import FileHandler
            file_handler = FileHandler()
            
            content_info = file_handler.read_text_file(file_path)
            
            if content_info['content'] and not content_info['error']:
                content = content_info['content']
                
                # Text statistics
                metadata['lines'] = content_info['lines']
                metadata['characters'] = content_info['characters']
                metadata['words'] = content_info['words']
                metadata['paragraphs'] = len([p for p in content.split('\n\n') if p.strip()])
                
                # Encoding information
                metadata['encoding'] = content_info['encoding']
                
                # Character analysis
                metadata['unique_characters'] = len(set(content))
                metadata['whitespace_characters'] = sum(1 for c in content if c.isspace())
                metadata['alphanumeric_characters'] = sum(1 for c in content if c.isalnum())
                
        except Exception as e:
            metadata['error'] = str(e)
        
        return metadata
    
    def _extract_archive_metadata(self, file_path):
        """Extract metadata from archive files."""
        metadata = {}
        
        try:
            import zipfile
            import tarfile
            
            suffix = file_path.suffix.lower()
            
            if suffix == '.zip':
                with zipfile.ZipFile(file_path, 'r') as zip_file:
                    metadata['archive_type'] = 'zip'
                    metadata['file_count'] = len(zip_file.filelist)
                    metadata['compressed_size'] = sum(f.compress_size for f in zip_file.filelist)
                    metadata['uncompressed_size'] = sum(f.file_size for f in zip_file.filelist)
                    
            elif suffix in ['.tar', '.tar.gz', '.tar.bz2', '.tar.xz']:
                with tarfile.open(file_path, 'r') as tar_file:
                    metadata['archive_type'] = 'tar'
                    members = tar_file.getmembers()
                    metadata['file_count'] = len(members)
                    metadata['uncompressed_size'] = sum(m.size for m in members if m.isfile())
                    
        except Exception as e:
            metadata['error'] = str(e)
        
        return metadata
    
    def _count_comment_lines(self, lines, file_extension):
        """Count comment lines based on file type."""
        comment_count = 0
        
        # Comment patterns for different languages
        single_line_comments = {
            '.py': '#',
            '.js': '//',
            '.ts': '//',
            '.java': '//',
            '.cpp': '//',
            '.c': '//',
            '.cs': '//',
            '.php': '//',
            '.go': '//',
            '.rs': '//',
            '.sh': '#',
            '.sql': '--'
        }
        
        comment_char = single_line_comments.get(file_extension)
        if comment_char:
            for line in lines:
                stripped = line.strip()
                if stripped.startswith(comment_char):
                    comment_count += 1
        
        return comment_count
    
    def _detect_programming_language(self, file_extension):
        """Detect programming language from file extension."""
        language_map = {
            '.py': 'Python',
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.h': 'C/C++ Header',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.go': 'Go',
            '.rs': 'Rust',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.scala': 'Scala',
            '.r': 'R',
            '.sql': 'SQL',
            '.sh': 'Shell Script',
            '.bat': 'Batch',
            '.ps1': 'PowerShell'
        }
        
        return language_map.get(file_extension, 'Unknown')
