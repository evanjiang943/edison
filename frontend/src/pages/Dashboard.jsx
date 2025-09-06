import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, DocumentTextIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI, submissionsAPI } from '../services/api';
import { getUser, canGrade } from '../utils/auth';

const Dashboard = () => {
  const [stats, setStats] = useState({
    assignments: 0,
    submissions: 0,
    pendingGrades: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const assignmentsResponse = await assignmentsAPI.list();
      const assignments = assignmentsResponse.data;
      setRecentAssignments(assignments.slice(0, 5));
      
      // Calculate stats
      let totalSubmissions = 0;
      let pendingGrades = 0;
      
      for (const assignment of assignments) {
        try {
          const submissionsResponse = await submissionsAPI.listByAssignment(assignment.id);
          totalSubmissions += submissionsResponse.data.length;
          
          // Count pending grades (submissions that haven't been reviewed)
          const pendingSubmissions = submissionsResponse.data.filter(
            sub => sub.status === 'graded' // AI graded but not human reviewed
          );
          pendingGrades += pendingSubmissions.length;
        } catch (error) {
          console.error('Error fetching submissions:', error);
        }
      }
      
      setStats({
        assignments: assignments.length,
        submissions: totalSubmissions,
        pendingGrades,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: 'View Assignments',
      href: '/assignments',
      icon: BookOpenIcon,
      color: 'bg-blue-500',
    },
    ...(canGrade() ? [{
      name: 'Grade Submissions',
      href: '/grading',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
    }] : []),
    {
      name: 'My Submissions',
      href: '/submissions',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
  ];

  const statCards = [
    {
      name: 'Total Assignments',
      value: stats.assignments,
      icon: BookOpenIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Total Submissions',
      value: stats.submissions,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    ...(canGrade() ? [{
      name: 'Pending Reviews',
      value: stats.pendingGrades,
      icon: ChartBarIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your {user?.role === 'student' ? 'coursework' : 'grading'}.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-md ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                to={action.href}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-md ${action.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {action.name}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Assignments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Assignments</h2>
          <Link
            to="/assignments"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            View all
          </Link>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {recentAssignments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No assignments yet. 
              {canGrade() && (
                <Link
                  to="/assignments/new"
                  className="text-primary-600 hover:text-primary-500 ml-1"
                >
                  Create your first assignment
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentAssignments.map((assignment) => (
                <li key={assignment.id}>
                  <Link
                    to={`/assignments/${assignment.id}`}
                    className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BookOpenIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {assignment.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Max: {assignment.max_points} pts
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
