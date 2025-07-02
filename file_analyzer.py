#!/usr/bin/env python3
"""
Comprehensive File and Directory Analysis Tool

A Python script for analyzing file and directory structures with metadata extraction
and comprehensive reporting capabilities.
"""

import argparse
import sys
import os
from pathlib import Path
import json
import time
from datetime import datetime

from utils.file_handler import FileHandler
from utils.metadata_extractor import MetadataExtractor
from utils.content_analyzer import ContentAnalyzer
from utils.report_generator import ReportGenerator


class FileAnalyzer:
    """Main class for file and directory analysis."""
    
    def __init__(self, target_path, output_format='json', output_file=None, verbose=False):
        """
        Initialize the FileAnalyzer.
        
        Args:
            target_path (str): Path to analyze
            output_format (str): Output format ('json', 'csv', 'txt')
            output_file (str): Output file path (optional)
            verbose (bool): Enable verbose output
        """
        self.target_path = Path(target_path).resolve()
        self.output_format = output_format
        self.output_file = output_file
        self.verbose = verbose
        
        # Initialize utility classes
        self.file_handler = FileHandler()
        self.metadata_extractor = MetadataExtractor()
        self.content_analyzer = ContentAnalyzer()
        self.report_generator = ReportGenerator()
        
        # Analysis results
        self.analysis_results = {
            'scan_info': {},
            'directory_structure': {},
            'file_analysis': [],
            'statistics': {},
            'errors': []
        }
    
    def analyze(self):
        """
        Perform comprehensive analysis of the target path.
        
        Returns:
            dict: Analysis results
        """
        if not self.target_path.exists():
            raise FileNotFoundError(f"Path does not exist: {self.target_path}")
        
        if not self.target_path.is_dir():
            raise ValueError(f"Path is not a directory: {self.target_path}")
        
        start_time = time.time()
        
        if self.verbose:
            print(f"Starting analysis of: {self.target_path}")
        
        # Initialize scan info
        self.analysis_results['scan_info'] = {
            'target_path': str(self.target_path),
            'scan_started': datetime.now().isoformat(),
            'total_files': 0,
            'total_directories': 0,
            'total_size': 0
        }
        
        try:
            # Scan directory structure
            self._scan_directory(self.target_path)
            
            # Generate statistics
            self._generate_statistics()
            
            # Complete scan info
            self.analysis_results['scan_info']['scan_completed'] = datetime.now().isoformat()
            self.analysis_results['scan_info']['scan_duration'] = time.time() - start_time
            
            if self.verbose:
                print(f"Analysis completed in {self.analysis_results['scan_info']['scan_duration']:.2f} seconds")
                print(f"Files analyzed: {self.analysis_results['scan_info']['total_files']}")
                print(f"Directories scanned: {self.analysis_results['scan_info']['total_directories']}")
            
        except Exception as e:
            self.analysis_results['errors'].append({
                'type': 'scan_error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
            if self.verbose:
                print(f"Error during analysis: {e}")
        
        return self.analysis_results
    
    def _scan_directory(self, directory_path):
        """
        Recursively scan directory and analyze files.
        
        Args:
            directory_path (Path): Directory to scan
        """
        try:
            for item in directory_path.iterdir():
                if item.is_file():
                    self._analyze_file(item)
                    self.analysis_results['scan_info']['total_files'] += 1
                elif item.is_dir():
                    self.analysis_results['scan_info']['total_directories'] += 1
                    if self.verbose:
                        print(f"Scanning directory: {item}")
                    self._scan_directory(item)
                    
        except PermissionError as e:
            self.analysis_results['errors'].append({
                'type': 'permission_error',
                'path': str(directory_path),
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
        except Exception as e:
            self.analysis_results['errors'].append({
                'type': 'directory_scan_error',
                'path': str(directory_path),
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    def _analyze_file(self, file_path):
        """
        Analyze a single file.
        
        Args:
            file_path (Path): File to analyze
        """
        try:
            if self.verbose:
                print(f"Analyzing file: {file_path}")
            
            # Extract metadata
            metadata = self.metadata_extractor.extract(file_path)
            
            # Analyze content
            content_analysis = self.content_analyzer.analyze(file_path)
            
            # Combine results
            file_analysis = {
                'path': str(file_path.relative_to(self.target_path)),
                'absolute_path': str(file_path),
                'metadata': metadata,
                'content_analysis': content_analysis
            }
            
            self.analysis_results['file_analysis'].append(file_analysis)
            self.analysis_results['scan_info']['total_size'] += metadata.get('size', 0)
            
        except Exception as e:
            self.analysis_results['errors'].append({
                'type': 'file_analysis_error',
                'path': str(file_path),
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    def _generate_statistics(self):
        """Generate comprehensive statistics from analysis results."""
        try:
            stats = self.report_generator.generate_statistics(self.analysis_results)
            self.analysis_results['statistics'] = stats
        except Exception as e:
            self.analysis_results['errors'].append({
                'type': 'statistics_error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            })
    
    def save_results(self):
        """Save analysis results to file."""
        if not self.output_file:
            return
        
        try:
            self.report_generator.save_report(
                self.analysis_results,
                self.output_file,
                self.output_format
            )
            if self.verbose:
                print(f"Results saved to: {self.output_file}")
        except Exception as e:
            print(f"Error saving results: {e}")
    
    def print_summary(self):
        """Print a summary of the analysis results."""
        print("\n" + "="*60)
        print("FILE ANALYSIS SUMMARY")
        print("="*60)
        
        scan_info = self.analysis_results['scan_info']
        stats = self.analysis_results['statistics']
        
        print(f"Target Path: {scan_info['target_path']}")
        print(f"Scan Duration: {scan_info.get('scan_duration', 0):.2f} seconds")
        print(f"Total Files: {scan_info['total_files']}")
        print(f"Total Directories: {scan_info['total_directories']}")
        print(f"Total Size: {self._format_size(scan_info['total_size'])}")
        
        if stats:
            print(f"\nFile Types Found: {len(stats.get('file_types', {}))}")
            print(f"Text Files: {stats.get('text_files', 0)}")
            print(f"Binary Files: {stats.get('binary_files', 0)}")
            
            # Show top file types
            file_types = stats.get('file_types', {})
            if file_types and 'by_extension' in file_types:
                print("\nTop File Types:")
                by_extension = file_types['by_extension']
                if isinstance(by_extension, dict):
                    sorted_types = sorted(by_extension.items(), key=lambda x: x[1] if isinstance(x[1], int) else 0, reverse=True)
                    for file_type, count in sorted_types[:5]:
                        print(f"  {file_type or '(no extension)'}: {count} files")
        
        if self.analysis_results['errors']:
            print(f"\nErrors Encountered: {len(self.analysis_results['errors'])}")
        
        print("="*60)
    
    def _format_size(self, size_bytes):
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} PB"


def main():
    """Main function with command-line interface."""
    parser = argparse.ArgumentParser(
        description="Comprehensive File and Directory Analysis Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python file_analyzer.py /path/to/analyze
  python file_analyzer.py ./attached_assets --output report.json --verbose
  python file_analyzer.py ~/documents --format csv --output analysis.csv
        """
    )
    
    parser.add_argument(
        'path',
        help='Path to analyze (directory)',
        nargs='?',
        default='./attached_assets'
    )
    
    parser.add_argument(
        '--output', '-o',
        help='Output file path',
        type=str
    )
    
    parser.add_argument(
        '--format', '-f',
        help='Output format',
        choices=['json', 'csv', 'txt'],
        default='json'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        help='Enable verbose output',
        action='store_true'
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize analyzer
        analyzer = FileAnalyzer(
            target_path=args.path,
            output_format=args.format,
            output_file=args.output,
            verbose=args.verbose
        )
        
        # Perform analysis
        results = analyzer.analyze()
        
        # Save results if output file specified
        if args.output:
            analyzer.save_results()
        
        # Print summary
        analyzer.print_summary()
        
        # Print results to stdout if no output file
        if not args.output:
            if args.format == 'json':
                print(json.dumps(results, indent=2, default=str))
            else:
                print("Use --output option to save results in CSV or TXT format")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nAnalysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
