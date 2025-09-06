import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, PencilIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { submissionsAPI, gradesAPI, assignmentsAPI } from '../services/api';

const GradeReview = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [grades, setGrades] = useState([]);
  const [editingGrade, setEditingGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      // Fetch submission
      const submissionResponse = await submissionsAPI.get(submissionId);
      const submissionData = submissionResponse.data;
      setSubmission(submissionData);

      // Fetch assignment
      const assignmentResponse = await assignmentsAPI.get(submissionData.assignment_id);
      setAssignment(assignmentResponse.data);

      // Fetch grades
      const gradesResponse = await gradesAPI.getBySubmission(submissionId);
      setGrades(gradesResponse.data);
    } catch (error) {
      setError('Failed to load grading data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGrade = (grade) => {
    setEditingGrade({
      ...grade,
      tempScore: grade.final_score,
      tempFeedback: grade.final_feedback,
    });
  };

  const handleSaveGrade = async () => {
    if (!editingGrade) return;

    setSaving(true);
    setError('');

    try {
      const updateData = {
        final_score: editingGrade.tempScore,
        final_feedback: editingGrade.tempFeedback,
      };

      const response = await gradesAPI.update(editingGrade.id, updateData);
      
      // Update grades list
      setGrades(grades.map(grade => 
        grade.id === editingGrade.id ? response.data : grade
      ));
      
      setEditingGrade(null);
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to update grade');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingGrade(null);
  };

  const calculateTotalScore = () => {
    return grades.reduce((sum, grade) => sum + grade.final_score, 0);
  };

  const getRubricForQuestion = (questionNo) => {
    if (!assignment?.rubric_json) return null;
    return assignment.rubric_json[questionNo];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!submission || !assignment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Submission not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grade Review</h1>
            <p className="text-gray-600 mt-1">
              {assignment.name} - Student ID: {submission.student_id}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              File: {submission.original_filename}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {calculateTotalScore()}/{assignment.max_points}
            </div>
            <p className="text-sm text-gray-500">Total Score</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Grades */}
      <div className="space-y-6">
        {grades.map((grade) => {
          const rubric = getRubricForQuestion(grade.question_no);
          const isEditing = editingGrade?.id === grade.id;
          const studentAnswer = submission.parsed_json?.[grade.question_no] || 'No answer provided';
          const expectedAnswer = assignment.answer_key_json?.[grade.question_no] || 'No answer key';

          return (
            <div key={grade.id} className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Question {grade.question_no.toUpperCase()}
                  </h2>
                  <div className="flex items-center space-x-2">
                    {grade.human_reviewed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        AI Only
                      </span>
                    )}
                    {!isEditing && (
                      <button
                        onClick={() => handleEditGrade(grade)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                {rubric && (
                  <p className="text-sm text-gray-500 mt-1">
                    Max Points: {rubric.max_points} | {rubric.criteria}
                  </p>
                )}
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Student Answer */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Student Answer</h3>
                    <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {studentAnswer}
                    </div>
                  </div>

                  {/* Expected Answer */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Expected Answer</h3>
                    <div className="bg-blue-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap">
                      {expectedAnswer}
                    </div>
                  </div>
                </div>

                {/* Grading Section */}
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* AI Grading */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">AI Grading</h3>
                      <div className="bg-purple-50 rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-purple-900">AI Score:</span>
                          <span className="text-lg font-bold text-purple-900">
                            {grade.ai_score}/{rubric?.max_points || 10}
                          </span>
                        </div>
                        <p className="text-sm text-purple-800">
                          {grade.ai_feedback}
                        </p>
                      </div>
                    </div>

                    {/* Final Grading */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Final Grade</h3>
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Score
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={rubric?.max_points || 10}
                              value={editingGrade.tempScore}
                              onChange={(e) => setEditingGrade({
                                ...editingGrade,
                                tempScore: parseInt(e.target.value) || 0
                              })}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Feedback
                            </label>
                            <textarea
                              rows={3}
                              value={editingGrade.tempFeedback}
                              onChange={(e) => setEditingGrade({
                                ...editingGrade,
                                tempFeedback: e.target.value
                              })}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={handleSaveGrade}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              <BookmarkIcon className="h-3 w-3 mr-1" />
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-green-50 rounded-md p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-900">Final Score:</span>
                            <span className="text-lg font-bold text-green-900">
                              {grade.final_score}/{rubric?.max_points || 10}
                            </span>
                          </div>
                          <p className="text-sm text-green-800">
                            {grade.final_feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4">
        <button
          onClick={() => navigate('/grading')}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Back to Grading
        </button>
      </div>
    </div>
  );
};

export default GradeReview;
