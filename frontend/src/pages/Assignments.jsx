import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, BookOpenIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';
import { canGrade } from '../utils/auth';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const response = await assignmentsAPI.list();
      const assignmentsData = response.data;
      
      // Fetch submission counts for each assignment
      const assignmentsWithStats = await Promise.all(
        assignmentsData.map(async (assignment) => {
          try {
            const submissionsResponse = await submissionsAPI.listByAssignment(assignment.id);
            return {
              ...assignment,
              submissionCount: submissionsResponse.data.length,
              gradedCount: submissionsResponse.data.filter(s => s.status === 'graded' || s.status === 'reviewed').length,
            };
          } catch (error) {
            return {
              ...assignment,
              submissionCount: 0,
              gradedCount: 0,
            };
          }
        })
      );
      
      setAssignments(assignmentsWithStats);
    } catch (error) {
      setError('Failed to load assignments');
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
          <p className="text-gray-600">
            Manage your assignments and track submissions
          </p>
        </div>
        {canGrade() && (
          <Link
            to="/assignments/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Assignment
          </Link>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Assignments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {assignments.length === 0 ? (
          <div className="p-6 text-center">
            <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first assignment.
            </p>
            {canGrade() && (
              <div className="mt-6">
                <Link
                  to="/assignments/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Assignment
                </Link>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <BookOpenIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/assignments/${assignment.id}`}
                          className="text-sm font-medium text-primary-600 hover:text-primary-500"
                        >
                          {assignment.name}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          {assignment.description || 'No description provided'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-sm text-gray-500">
                            <ChartBarIcon className="h-4 w-4 mr-1" />
                            Max Points: {assignment.max_points}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <UsersIcon className="h-4 w-4 mr-1" />
                            {assignment.submissionCount} submissions
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="text-green-600">
                              {assignment.gradedCount} graded
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/assignments/${assignment.id}/submissions`}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        View Submissions
                      </Link>
                      {canGrade() && (
                        <Link
                          to={`/assignments/${assignment.id}/edit`}
                          className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Assignments;
