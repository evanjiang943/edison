import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpTrayIcon, DocumentTextIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';
import { getUser, isStudent } from '../utils/auth';

const Submissions = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUser();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch assignments
      const assignmentsResponse = await assignmentsAPI.list();
      const assignmentsData = assignmentsResponse.data;
      setAssignments(assignmentsData);

      // Fetch submissions for each assignment
      const submissionsData = {};
      for (const assignment of assignmentsData) {
        try {
          const submissionsResponse = await submissionsAPI.listByAssignment(assignment.id);
          if (isStudent()) {
            // Students see only their own submissions
            submissionsData[assignment.id] = submissionsResponse.data.filter(
              sub => sub.student_id === user.id
            );
          } else {
            // Instructors/TAs see all submissions
            submissionsData[assignment.id] = submissionsResponse.data;
          }
        } catch (error) {
          submissionsData[assignment.id] = [];
        }
      }
      setSubmissions(submissionsData);
    } catch (error) {
      setError('Failed to load submissions');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploaded':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />;
      case 'graded':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'reviewed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded';
      case 'processing':
        return 'Processing';
      case 'graded':
        return 'Graded';
      case 'reviewed':
        return 'Reviewed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploaded':
        return 'text-yellow-800 bg-yellow-100';
      case 'processing':
        return 'text-blue-800 bg-blue-100';
      case 'graded':
        return 'text-green-800 bg-green-100';
      case 'reviewed':
        return 'text-blue-800 bg-blue-100';
      case 'error':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isStudent() ? 'My Submissions' : 'All Submissions'}
        </h1>
        <p className="text-gray-600">
          {isStudent() 
            ? 'View your submitted assignments and grades'
            : 'Monitor all student submissions and grades'
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Assignments and Submissions */}
      <div className="space-y-6">
        {assignments.map((assignment) => {
          const assignmentSubmissions = submissions[assignment.id] || [];
          const userSubmission = assignmentSubmissions.find(sub => sub.student_id === user.id);

          return (
            <div key={assignment.id} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {assignment.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {assignment.description || 'No description provided'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Max Points: {assignment.max_points}
                    </p>
                  </div>
                  {isStudent() && !userSubmission && (
                    <Link
                      to={`/assignments/${assignment.id}/submit`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      Submit
                    </Link>
                  )}
                </div>
              </div>

              <div className="px-6 py-4">
                {assignmentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {isStudent() ? 'No submission yet' : 'No submissions'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {isStudent() 
                        ? 'Upload your assignment to get started.'
                        : 'Students haven\'t submitted yet.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-md"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getStatusIcon(submission.status)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {submission.original_filename}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                                {getStatusText(submission.status)}
                              </span>
                            </div>
                            {!isStudent() && (
                              <p className="text-sm text-gray-500">
                                Student ID: {submission.student_id}
                              </p>
                            )}
                            {submission.total_score !== undefined && (
                              <p className="text-sm text-gray-600">
                                Score: {submission.total_score}/{assignment.max_points}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {(submission.status === 'graded' || submission.status === 'reviewed') && (
                            <Link
                              to={`/submissions/${submission.id}/grades`}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              View Grades
                            </Link>
                          )}
                          <Link
                            to={`/submissions/${submission.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
          <p className="mt-1 text-sm text-gray-500">
            No assignments have been created yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default Submissions;
