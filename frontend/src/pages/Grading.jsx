import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AcademicCapIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';

const Grading = () => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

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
          submissionsData[assignment.id] = submissionsResponse.data.filter(
            sub => sub.status === 'graded' || sub.status === 'reviewed'
          );
        } catch (error) {
          submissionsData[assignment.id] = [];
        }
      }
      setSubmissions(submissionsData);
    } catch (error) {
      setError('Failed to load grading data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'graded':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'reviewed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'graded':
        return 'Needs Review';
      case 'reviewed':
        return 'Reviewed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
        return 'text-yellow-800 bg-yellow-100';
      case 'reviewed':
        return 'text-green-800 bg-green-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const getFilteredSubmissions = () => {
    if (selectedAssignment === 'all') {
      return Object.values(submissions).flat();
    }
    return submissions[selectedAssignment] || [];
  };

  const getTotalSubmissions = () => {
    return Object.values(submissions).flat().length;
  };

  const getPendingReviews = () => {
    return Object.values(submissions).flat().filter(sub => sub.status === 'graded').length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filteredSubmissions = getFilteredSubmissions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grading Dashboard</h1>
        <p className="text-gray-600">
          Review AI-graded submissions and provide final feedback
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-blue-50">
                <AcademicCapIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Submissions
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {getTotalSubmissions()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-yellow-50">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Reviews
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {getPendingReviews()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 rounded-md bg-green-50">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Completed Reviews
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {getTotalSubmissions() - getPendingReviews()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <label htmlFor="assignment-filter" className="text-sm font-medium text-gray-700">
            Filter by Assignment:
          </label>
          <select
            id="assignment-filter"
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="block w-64 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="all">All Assignments</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredSubmissions.length === 0 ? (
          <div className="p-6 text-center">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions to grade</h3>
            <p className="mt-1 text-sm text-gray-500">
              All submissions have been reviewed or no submissions exist.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredSubmissions.map((submission) => {
              const assignment = assignments.find(a => a.id === submission.assignment_id);
              
              return (
                <li key={submission.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(submission.status)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {assignment?.name || 'Unknown Assignment'}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                              {getStatusText(submission.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Student ID: {submission.student_id} | File: {submission.original_filename}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="text-sm text-gray-500">
                              Score: {submission.total_score}/{assignment?.max_points || 0}
                            </div>
                            <div className="text-sm text-gray-500">
                              Uploaded: {new Date(submission.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/submissions/${submission.id}/grades`}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Review Grades
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Grading;
