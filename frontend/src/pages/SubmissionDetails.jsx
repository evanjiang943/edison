import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissionsAPI, gradesAPI, assignmentsAPI } from '../services/api';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowLeftIcon,
  AcademicCapIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const SubmissionDetails = () => {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubmissionDetails();
  }, [id]);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch submission details
      const submissionResponse = await submissionsAPI.get(id);
      const submissionData = submissionResponse.data;
      setSubmission(submissionData);

      // Fetch assignment details
      const assignmentResponse = await assignmentsAPI.get(submissionData.assignment_id);
      setAssignment(assignmentResponse.data);

      // Fetch grades if submission is graded
      if (submissionData.status === 'graded' || submissionData.status === 'reviewed') {
        try {
          const gradesResponse = await gradesAPI.getBySubmission(id);
          setGrades(gradesResponse.data);
        } catch (gradesError) {
          console.log('No grades found yet');
          setGrades([]);
        }
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'graded':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'reviewed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'processing':
        return 'Processing...';
      case 'graded':
        return 'AI Graded';
      case 'reviewed':
        return 'Reviewed';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const renderSubmissionContent = () => {
    if (!submission.parsed_json) {
      return (
        <div className="text-center py-8">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            Submission content is being processed...
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {Object.entries(submission.parsed_json).map(([questionId, answer]) => (
          <div key={questionId} className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {questionId.toUpperCase()}
            </h3>
            <div className="prose max-w-none">
              <div className="bg-gray-50 rounded-md p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                  {answer}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRubricAndGrades = () => {
    if (!assignment?.rubric_json || grades.length === 0) {
      return (
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {grades.length === 0 ? 'No grades available yet' : 'No rubric available'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Object.entries(assignment.rubric_json).map(([questionId, rubric]) => {
          const grade = grades.find(g => g.question_no === questionId);
          
          return (
            <div key={questionId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{questionId.toUpperCase()}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">
                    {grade?.final_score ?? grade?.ai_score ?? 0} / {rubric.max_points}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((grade?.final_score ?? grade?.ai_score ?? 0) / rubric.max_points) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Criteria:</p>
                  <p className="text-sm text-gray-600">{rubric.criteria}</p>
                </div>
                
                {grade && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">AI Feedback:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 rounded p-2">
                        {grade.ai_feedback}
                      </p>
                    </div>
                    
                    {grade.final_feedback && grade.final_feedback !== grade.ai_feedback && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Instructor Feedback:</p>
                        <p className="text-sm text-gray-600 bg-green-50 rounded p-2">
                          {grade.final_feedback}
                        </p>
                      </div>
                    )}
                    
                    {grade.final_score !== grade.ai_score && (
                      <div className="flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 rounded p-2">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        <span>Grade was manually adjusted by instructor</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Overall Score Summary */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-gray-900">Total Score</span>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-gray-900">
                {submission.total_score} / {assignment.max_points}
              </span>
              <span className="text-sm text-gray-500">
                ({Math.round((submission.total_score / assignment.max_points) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Submission not found</h3>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            to="/submissions"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Submissions
          </Link>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assignment.name}</h1>
              <p className="text-gray-600 mt-1">Submission Details</p>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusIcon(submission.status)}
              <span className="text-sm font-medium text-gray-900">
                {getStatusText(submission.status)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Submitted:</span>
              <span className="ml-2 text-gray-600">
                {new Date(submission.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">File:</span>
              <span className="ml-2 text-gray-600">{submission.original_filename}</span>
            </div>
            {submission.total_score !== undefined && (
              <div>
                <span className="font-medium text-gray-700">Score:</span>
                <span className="ml-2 text-gray-600">
                  {submission.total_score} / {assignment.max_points}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submission Content */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Submission Content
              </h2>
            </div>
            <div className="p-6">
              {renderSubmissionContent()}
            </div>
          </div>
        </div>

        {/* Rubric and Grades */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2" />
                Rubric & Grades
              </h2>
            </div>
            <div className="p-6">
              {renderRubricAndGrades()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetails;
