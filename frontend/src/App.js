import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import AssignmentForm from './pages/AssignmentForm';
import AssignmentDashboard from './pages/AssignmentDashboard';
import EnhancedAssignmentForm from './pages/EnhancedAssignmentForm';
import Submissions from './pages/Submissions';
import SubmissionUpload from './pages/SubmissionUpload';
import Grading from './pages/Grading';
import GradeReview from './pages/GradeReview';
import SubmissionDetails from './pages/SubmissionDetails';
import { isAuthenticated } from './utils/auth';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments" element={
            <ProtectedRoute>
              <Layout>
                <Assignments />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments/new" element={
            <ProtectedRoute>
              <Layout>
                <AssignmentForm />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments/new-enhanced" element={
            <ProtectedRoute>
              <Layout>
                <EnhancedAssignmentForm />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments/:id" element={
            <ProtectedRoute>
              <Layout>
                <AssignmentDashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments/:id/edit" element={
            <ProtectedRoute>
              <Layout>
                <AssignmentForm />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/assignments/:assignmentId/submit" element={
            <ProtectedRoute>
              <Layout>
                <SubmissionUpload />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/submissions" element={
            <ProtectedRoute>
              <Layout>
                <Submissions />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/submissions/:id" element={
            <ProtectedRoute>
              <Layout>
                <SubmissionDetails />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/submissions/:submissionId/grades" element={
            <ProtectedRoute>
              <Layout>
                <GradeReview />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/grading" element={
            <ProtectedRoute>
              <Layout>
                <Grading />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
