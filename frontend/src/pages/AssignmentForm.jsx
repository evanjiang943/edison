import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { assignmentsAPI } from '../services/api';

const AssignmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_points: 100,
  });
  const [rubric, setRubric] = useState([
    { question: 'q1', max_points: 10, criteria: '' }
  ]);
  const [answerKey, setAnswerKey] = useState([
    { question: 'q1', answer: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        max_points: assignment.max_points,
      });

      // Convert rubric JSON to array format
      const rubricArray = Object.entries(assignment.rubric_json).map(([question, data]) => ({
        question,
        max_points: data.max_points || 10,
        criteria: data.criteria || data.description || '',
      }));
      setRubric(rubricArray);

      // Convert answer key JSON to array format
      const answerKeyArray = Object.entries(assignment.answer_key_json).map(([question, answer]) => ({
        question,
        answer,
      }));
      setAnswerKey(answerKeyArray);
    } catch (error) {
      setError('Failed to load assignment');
      console.error('Error fetching assignment:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_points' ? parseInt(value) || 0 : value,
    }));
  };

  const handleRubricChange = (index, field, value) => {
    const newRubric = [...rubric];
    newRubric[index] = {
      ...newRubric[index],
      [field]: field === 'max_points' ? parseInt(value) || 0 : value,
    };
    setRubric(newRubric);
  };

  const handleAnswerKeyChange = (index, field, value) => {
    const newAnswerKey = [...answerKey];
    newAnswerKey[index] = {
      ...newAnswerKey[index],
      [field]: value,
    };
    setAnswerKey(newAnswerKey);
  };

  const addRubricItem = () => {
    const nextQuestionNum = rubric.length + 1;
    setRubric([...rubric, { question: `q${nextQuestionNum}`, max_points: 10, criteria: '' }]);
    setAnswerKey([...answerKey, { question: `q${nextQuestionNum}`, answer: '' }]);
  };

  const removeRubricItem = (index) => {
    if (rubric.length > 1) {
      setRubric(rubric.filter((_, i) => i !== index));
      setAnswerKey(answerKey.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert rubric array to JSON format
      const rubricJson = {};
      rubric.forEach(item => {
        rubricJson[item.question] = {
          max_points: item.max_points,
          criteria: item.criteria,
        };
      });

      // Convert answer key array to JSON format
      const answerKeyJson = {};
      answerKey.forEach(item => {
        answerKeyJson[item.question] = item.answer;
      });

      // Calculate total max points
      const totalMaxPoints = rubric.reduce((sum, item) => sum + item.max_points, 0);

      const assignmentData = {
        ...formData,
        max_points: totalMaxPoints,
        rubric_json: rubricJson,
        answer_key_json: answerKeyJson,
      };

      if (isEdit) {
        await assignmentsAPI.update(id, assignmentData);
      } else {
        await assignmentsAPI.create(assignmentData);
      }

      navigate('/assignments');
    } catch (error) {
      setError(error.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} assignment`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Assignment' : 'Create New Assignment'}
          </h1>
          <p className="text-gray-600">
            Set up your assignment with rubric and answer key for AI grading
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 gap-6">
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

          {/* Rubric */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Grading Rubric</h2>
              <button
                type="button"
                onClick={addRubricItem}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Question
              </button>
            </div>
            
            <div className="space-y-4">
              {rubric.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      Question {index + 1}
                    </h3>
                    {rubric.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRubricItem(index)}
                        className="text-red-600 hover:text-red-500"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Question ID
                      </label>
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => handleRubricChange(index, 'question', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                        placeholder="q1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Points
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.max_points}
                        onChange={(e) => handleRubricChange(index, 'max_points', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Grading Criteria
                      </label>
                      <textarea
                        rows={2}
                        value={item.criteria}
                        onChange={(e) => handleRubricChange(index, 'criteria', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                        placeholder="What to look for when grading..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Key */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Answer Key</h2>
            <div className="space-y-4">
              {answerKey.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    {item.question} - Expected Answer
                  </h3>
                  <textarea
                    rows={4}
                    value={item.answer}
                    onChange={(e) => handleAnswerKeyChange(index, 'answer', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                    placeholder="Enter the expected answer or solution..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/assignments')}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Assignment' : 'Create Assignment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentForm;
