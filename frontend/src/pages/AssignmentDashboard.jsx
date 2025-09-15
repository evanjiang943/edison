import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  UsersIcon, 
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';
import { canGrade } from '../utils/auth';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const AssignmentDashboard = () => {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    graded: 0,
    pending: 0,
    avgScore: 0,
    minScore: 0,
    maxScore: 0,
    stdDev: 0
  });

  useEffect(() => {
    fetchAssignmentData();
  }, [id]);

  const fetchAssignmentData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignment details
      const assignmentResponse = await assignmentsAPI.get(id);
      setAssignment(assignmentResponse.data);

      // Fetch submissions for this assignment
      const submissionsResponse = await submissionsAPI.listByAssignment(id);
      const submissionsData = submissionsResponse.data;
      setSubmissions(submissionsData);

      // Calculate statistics
      const total = submissionsData.length;
      const graded = submissionsData.filter(s => s.status === 'graded' || s.status === 'reviewed').length;
      const pending = total - graded;
      
      const scores = submissionsData
        .filter(s => s.status === 'graded' || s.status === 'reviewed')
        .map(s => s.total_score);
      
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const minScore = scores.length > 0 ? Math.min(...scores) : 0;
      const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
      
      // Calculate standard deviation
      const variance = scores.length > 0 ? 
        scores.reduce((acc, score) => acc + Math.pow(score - avgScore, 2), 0) / scores.length : 0;
      const stdDev = Math.sqrt(variance);

      setStats({
        total,
        graded,
        pending,
        avgScore: Math.round(avgScore * 100) / 100,
        minScore,
        maxScore,
        stdDev: Math.round(stdDev * 100) / 100
      });

    } catch (error) {
      setError('Failed to load assignment data');
      console.error('Error fetching assignment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeDistribution = () => {
    const gradedSubmissions = submissions.filter(s => s.status === 'graded' || s.status === 'reviewed');
    const maxPoints = assignment?.max_points || 100;
    
    // Create grade ranges (0-10, 10-20, etc.)
    const ranges = [];
    for (let i = 0; i < maxPoints; i += 10) {
      ranges.push({
        min: i,
        max: Math.min(i + 10, maxPoints),
        count: gradedSubmissions.filter(s => s.total_score >= i && s.total_score < i + 10).length
      });
    }
    
    return ranges;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderLatexText = (text) => {
    if (!text) return null;
    
    // Simple LaTeX detection and rendering
    const parts = text.split(/(\$[^$]+\$|\$\$[^$]+\$\$)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const math = part.slice(2, -2);
        try {
          return <BlockMath key={index} math={math} />;
        } catch (e) {
          return <span key={index}>{part}</span>;
        }
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const math = part.slice(1, -1);
        try {
          return <InlineMath key={index} math={math} />;
        } catch (e) {
          return <span key={index}>{part}</span>;
        }
      } else {
        return <span key={index}>{part}</span>;
      }
    });
  };

  const renderRubric = () => {
    if (!assignment?.rubric_json || Object.keys(assignment.rubric_json).length === 0) {
      return null;
    }

    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Grading Rubric</h3>
        <div className="space-y-4">
          {Object.entries(assignment.rubric_json).map(([questionId, rubric]) => (
            <div key={questionId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  {questionId.toUpperCase()}
                </h4>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {rubric.max_points || 10} pts
                </span>
              </div>
              
              {/* Question Statement */}
              {rubric.question_text && (
                <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-sm text-blue-900 font-medium">Question:</p>
                  <div className="text-sm text-blue-800 mt-1">
                    {renderLatexText(rubric.question_text)}
                  </div>
                </div>
              )}
              
              {/* Grading Criteria */}
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-700 font-medium">Grading Criteria:</p>
                <div className="text-sm text-gray-600 mt-1">
                  {renderLatexText(rubric.criteria || "Grade based on correctness and completeness")}
                </div>
              </div>
            </div>
          ))}
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

  if (error || !assignment) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || 'Assignment not found'}
      </div>
    );
  }

  const gradeDistribution = getGradeDistribution();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{assignment.name}</h1>
            <p className="text-gray-600 mt-1">{assignment.description || 'No description provided'}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                Max Points: {assignment.max_points}
              </span>
              <span className="flex items-center">
                <UsersIcon className="h-4 w-4 mr-1" />
                {stats.total} Students
              </span>
            </div>
          </div>
          
          {canGrade() && (
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download Grades
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Email Students
              </button>
              <Link
                to={`/assignments/${assignment.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Edit Assignment
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Submissions</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Graded</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.graded}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Score</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.avgScore}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Distribution */}
      {stats.graded > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Grade Distribution</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-4 text-sm text-gray-500 mb-2">
              <span>Minimum: {stats.minScore}</span>
              <span>Maximum: {stats.maxScore}</span>
              <span>Mean: {stats.avgScore}</span>
              <span>Std Dev: {stats.stdDev}</span>
              <span>{stats.graded} Students</span>
            </div>
            
            {/* Simple bar chart */}
            <div className="flex items-end space-x-1 h-32">
              {gradeDistribution.map((range, index) => {
                const maxCount = Math.max(...gradeDistribution.map(r => r.count));
                const height = maxCount > 0 ? (range.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      <div>{range.count}</div>
                      <div>{range.min}-{range.max}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grading Rubric */}
      {renderRubric()}

      {/* Submissions Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Student Submissions
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            View and manage individual student submissions
          </p>
        </div>
        
        {submissions.length === 0 ? (
          <div className="p-6 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Students haven't submitted their work for this assignment yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {submission.student?.name || `Student ${submission.student_id}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        {submission.student?.email || submission.original_filename}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {submission.status === 'graded' || submission.status === 'reviewed' 
                          ? `${submission.total_score}/${assignment.max_points}`
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        submission.status === 'graded' || submission.status === 'reviewed'
                          ? 'bg-green-100 text-green-800'
                          : submission.status === 'submitted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(submission.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/submissions/${submission.id}`}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        View
                      </Link>
                      {canGrade() && (
                        <Link
                          to={`/grading?submissionId=${submission.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Grade
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDashboard;
