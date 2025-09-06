import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';

const SubmissionUpload = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssignment = async () => {
    try {
      const response = await assignmentsAPI.get(assignmentId);
      setAssignment(response.data);
    } catch (error) {
      setError('Failed to load assignment');
      console.error('Error fetching assignment:', error);
    }
  };

  const handleFileSelect = (file) => {
    // Validate file type
    if (!file.name.endsWith('.tex') && !file.name.endsWith('.txt')) {
      setError('Please select a .tex or .txt file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await submissionsAPI.upload(assignmentId, selectedFile);
      navigate('/submissions', { 
        state: { message: 'Submission uploaded successfully!' }
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to upload submission');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError('');
  };

  if (!assignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Assignment</h1>
          <p className="text-gray-600">Upload your LaTeX file for grading</p>
        </div>

        {/* Assignment Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h2 className="text-lg font-medium text-blue-900">{assignment.name}</h2>
          {assignment.description && (
            <p className="text-blue-700 mt-1">{assignment.description}</p>
          )}
          <p className="text-blue-700 mt-2">
            Maximum Points: {assignment.max_points}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload LaTeX File *
            </label>
            
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragOver 
                    ? 'border-primary-400 bg-primary-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-500 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-500"> or drag and drop</span>
                    <input
                      id="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".tex,.txt"
                      onChange={handleFileInputChange}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  LaTeX (.tex) or Text (.txt) files up to 10MB
                </p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-500 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Submission Guidelines
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use LaTeX sections (e.g., \section&#123;Q1&#125;, \section&#123;Q2&#125;) to organize your answers</li>
              <li>• Each question should be clearly labeled</li>
              <li>• Include all necessary mathematical notation and explanations</li>
              <li>• File will be automatically parsed and graded by AI</li>
              <li>• You can only submit once per assignment</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/submissions')}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmissionUpload;
