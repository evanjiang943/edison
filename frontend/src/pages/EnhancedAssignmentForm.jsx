import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  DocumentArrowUpIcon, 
  EyeIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { assignmentsAPI } from '../services/api';
import FileUploadZone from '../components/FileUploadZone';
import CollapsibleQuestion from '../components/CollapsibleQuestion';

const EnhancedAssignmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // File upload states
  const [files, setFiles] = useState({
    assignment: null,
    answer_key: null,
    rubric: null
  });

  // Parsing states
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchAssignment();
    }
  }, [id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAssignment = async () => {
    try {
      const response = await assignmentsAPI.get(id);
      const assignment = response.data;
      
      setFormData({
        name: assignment.name,
        description: assignment.description,
      });
    } catch (error) {
      setError('Failed to load assignment');
      console.error('Error fetching assignment:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = (fileType, file) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
    
    // Clear previous parsing results when files change
    setParsed(null);
    setParseError('');
  };

  const handleRemoveFile = (fileType) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: null
    }));
    
    // Clear parsing results
    setParsed(null);
    setParseError('');
  };

  const handleParseFiles = async () => {
    if (!files.assignment && !files.answer_key && !files.rubric) {
      setParseError('Please upload at least one file to parse');
      return;
    }

    setParsing(true);
    setParseError('');

    try {
      const formData = new FormData();
      
      if (files.assignment) {
        formData.append('assignment_file', files.assignment);
      }
      if (files.answer_key) {
        formData.append('answer_key_file', files.answer_key);
      }
      if (files.rubric) {
        formData.append('rubric_file', files.rubric);
      }

      const response = await assignmentsAPI.parseFiles(formData);
      const result = response.data;
      setParsed(result);
      setShowPreview(true);
    } catch (error) {
      setParseError(error.message || 'Failed to parse files');
    } finally {
      setParsing(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!formData.name.trim()) {
      setError('Assignment name is required');
      return;
    }

    if (!parsed) {
      setError('Please parse files first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const createFormData = new FormData();
      createFormData.append('name', formData.name);
      createFormData.append('description', formData.description);
      createFormData.append('parsed_data', JSON.stringify(parsed));

      await assignmentsAPI.createFromParsed(createFormData);

      navigate('/assignments', { 
        state: { message: 'Assignment created successfully!' }
      });
    } catch (error) {
      setError(error.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const getTotalQuestions = () => {
    if (!parsed) return 0;
    
    let total = 0;
    Object.values(parsed).forEach(doc => {
      if (doc && doc.questions) {
        total += doc.questions.length;
        doc.questions.forEach(q => {
          total += q.parts ? q.parts.length : 0;
        });
      }
    });
    return total;
  };

  const getTotalPoints = () => {
    if (!parsed) return 0;
    
    let total = 0;
    Object.values(parsed).forEach(doc => {
      if (doc && doc.questions) {
        doc.questions.forEach(q => {
          total += q.max_points || 0;
          if (q.parts) {
            q.parts.forEach(p => {
              total += p.max_points || 0;
            });
          }
        });
      }
    });
    return total;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Assignment' : 'Create Assignment from Files'}
          </h1>
          <p className="text-gray-600">
            Upload your assignment files and let AI parse them into a structured format
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: File Upload and Basic Info */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Assignment Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., Problem Set 1"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleFormChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Brief description of the assignment..."
                  />
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Files</h2>
              <div className="space-y-4">
                <FileUploadZone
                  title="Assignment Questions"
                  description="Upload the main assignment document with questions"
                  onFileSelect={(file) => handleFileSelect('assignment', file)}
                  selectedFile={files.assignment}
                  onRemoveFile={() => handleRemoveFile('assignment')}
                />
                
                <FileUploadZone
                  title="Answer Key"
                  description="Upload the answer key or solution document"
                  onFileSelect={(file) => handleFileSelect('answer_key', file)}
                  selectedFile={files.answer_key}
                  onRemoveFile={() => handleRemoveFile('answer_key')}
                />
                
                <FileUploadZone
                  title="Grading Rubric"
                  description="Upload the grading rubric document"
                  onFileSelect={(file) => handleFileSelect('rubric', file)}
                  selectedFile={files.rubric}
                  onRemoveFile={() => handleRemoveFile('rubric')}
                />
              </div>

              {/* Parse Button */}
              <div className="mt-6">
                <button
                  onClick={handleParseFiles}
                  disabled={parsing || (!files.assignment && !files.answer_key && !files.rubric)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {parsing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Parsing Files...
                    </>
                  ) : (
                    <>
                      <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                      Parse Files with AI
                    </>
                  )}
                </button>
              </div>

              {/* Parse Error */}
              {parseError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {parseError}
                </div>
              )}

              {/* Parse Success */}
              {parsed && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    <div>
                      <p className="font-medium">Files parsed successfully!</p>
                      <p className="text-sm">
                        Found {getTotalQuestions()} questions/parts, {getTotalPoints()} total points
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            {parsed && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Preview</h2>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </button>
                  </div>
                </div>

                {showPreview && (
                  <div className="p-6 max-h-96 overflow-y-auto">
                    {/* Assignment Questions */}
                    {parsed.assignment && parsed.assignment.questions && (
                      <div className="mb-6">
                        <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                          <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                          Assignment Questions
                        </h3>
                        <div className="space-y-3">
                          {parsed.assignment.questions.map((question, index) => (
                            <CollapsibleQuestion
                              key={question.id || index}
                              question={question}
                              showAnswer={false}
                              showRubric={false}
                              className="text-sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Answer Key */}
                    {parsed.answer_key && parsed.answer_key.questions && (
                      <div className="mb-6">
                        <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                          <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
                          Answer Key
                        </h3>
                        <div className="space-y-3">
                          {parsed.answer_key.questions.map((question, index) => (
                            <CollapsibleQuestion
                              key={question.id || index}
                              question={question}
                              showAnswer={true}
                              showRubric={false}
                              className="text-sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rubric */}
                    {parsed.rubric && parsed.rubric.questions && (
                      <div className="mb-6">
                        <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                          <DocumentTextIcon className="h-5 w-5 mr-2 text-yellow-600" />
                          Grading Rubric
                        </h3>
                        <div className="space-y-3">
                          {parsed.rubric.questions.map((question, index) => (
                            <CollapsibleQuestion
                              key={question.id || index}
                              question={question}
                              showAnswer={false}
                              showRubric={true}
                              className="text-sm"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/assignments')}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateAssignment}
            disabled={loading || !parsed || !formData.name.trim()}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : (isEdit ? 'Update Assignment' : 'Create Assignment')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAssignmentForm;
