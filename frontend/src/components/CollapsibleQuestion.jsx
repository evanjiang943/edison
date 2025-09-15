import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const LaTeXRenderer = ({ content, inline = false }) => {
  if (!content) return null;

  // Simple LaTeX detection and rendering
  const renderLatex = (text) => {
    if (typeof text !== 'string') return text;

    // Split text by LaTeX delimiters
    const parts = [];
    let currentText = text;
    let key = 0;

    // Handle display math ($$...$$)
    const displayMathRegex = /\$\$(.*?)\$\$/gs;
    currentText = currentText.replace(displayMathRegex, (match, math) => {
      const placeholder = `__DISPLAY_MATH_${key}__`;
      parts.push({ type: 'display', content: math.trim(), placeholder, key });
      key++;
      return placeholder;
    });

    // Handle inline math ($...$)
    const inlineMathRegex = /\$([^$]*?)\$/g;
    currentText = currentText.replace(inlineMathRegex, (match, math) => {
      const placeholder = `__INLINE_MATH_${key}__`;
      parts.push({ type: 'inline', content: math.trim(), placeholder, key });
      key++;
      return placeholder;
    });

    // Split by placeholders and render
    const segments = currentText.split(/(__(?:DISPLAY|INLINE)_MATH_\d+__)/);
    
    return segments.map((segment, index) => {
      const mathPart = parts.find(p => p.placeholder === segment);
      if (mathPart) {
        try {
          return mathPart.type === 'display' ? (
            <BlockMath key={index} math={mathPart.content} />
          ) : (
            <InlineMath key={index} math={mathPart.content} />
          );
        } catch (error) {
          // If LaTeX rendering fails, show the original text
          return (
            <span key={index} className="text-red-600 font-mono text-sm">
              ${mathPart.content}$
            </span>
          );
        }
      }
      return segment;
    });
  };

  // Handle basic LaTeX formatting
  const formatText = (text) => {
    if (typeof text !== 'string') return text;
    
    // Convert common LaTeX commands to HTML
    let formatted = text
      .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
      .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
      .replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
      .replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')
      .replace(/\\\\|\\newline/g, '<br/>')
      .replace(/\\item\s*/g, '• ');

    return formatted;
  };

  const processedContent = formatText(content);
  const renderedContent = renderLatex(processedContent);

  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: processedContent }} />;
  }

  return (
    <div className="prose prose-sm max-w-none">
      <div dangerouslySetInnerHTML={{ __html: processedContent.replace(/\n/g, '<br/>') }} />
      {renderedContent !== processedContent && (
        <div className="mt-2">
          {renderedContent}
        </div>
      )}
    </div>
  );
};

const CollapsibleQuestion = ({ 
  question, 
  showAnswer = true, 
  showRubric = true,
  defaultExpanded = false,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedParts, setExpandedParts] = useState({});

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const togglePartExpanded = (partId) => {
    setExpandedParts(prev => ({
      ...prev,
      [partId]: !prev[partId]
    }));
  };

  const hasContent = (obj) => {
    return obj && (obj.question_text || obj.answer_text || obj.rubric_text);
  };

  if (!hasContent(question)) {
    return null;
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      {/* Main Question Header */}
      <div
        onClick={toggleExpanded}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
          )}
          <h3 className="text-lg font-medium text-gray-900">
            Question {question.id}
            {question.max_points && (
              <span className="ml-2 text-sm text-gray-500">
                ({question.max_points} points)
              </span>
            )}
          </h3>
        </div>
        {question.parts && question.parts.length > 0 && (
          <span className="text-sm text-gray-500">
            {question.parts.length} part{question.parts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Main Question Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="p-4 space-y-4">
            {/* Question Text */}
            {question.question_text && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Question</h4>
                <div className="bg-blue-50 p-3 rounded-md">
                  <LaTeXRenderer content={question.question_text} />
                </div>
              </div>
            )}

            {/* Answer */}
            {showAnswer && question.answer_text && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Answer</h4>
                <div className="bg-green-50 p-3 rounded-md">
                  <LaTeXRenderer content={question.answer_text} />
                </div>
              </div>
            )}

            {/* Rubric */}
            {showRubric && question.rubric_text && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Grading Rubric</h4>
                <div className="bg-yellow-50 p-3 rounded-md">
                  <LaTeXRenderer content={question.rubric_text} />
                </div>
              </div>
            )}

            {/* Question Parts */}
            {question.parts && question.parts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Parts</h4>
                {question.parts.map((part, index) => (
                  <div key={part.id || index} className="border border-gray-200 rounded-md">
                    {/* Part Header */}
                    <div
                      onClick={() => togglePartExpanded(part.id || index)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {expandedParts[part.id || index] ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        )}
                        <h5 className="text-sm font-medium text-gray-800">
                          Part {part.id}
                          {part.max_points && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({part.max_points} points)
                            </span>
                          )}
                        </h5>
                      </div>
                    </div>

                    {/* Part Content */}
                    {expandedParts[part.id || index] && (
                      <div className="border-t border-gray-100 p-3 space-y-3">
                        {/* Part Question */}
                        {part.question_text && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Question</h6>
                            <div className="bg-blue-50 p-2 rounded text-sm">
                              <LaTeXRenderer content={part.question_text} />
                            </div>
                          </div>
                        )}

                        {/* Part Answer */}
                        {showAnswer && part.answer_text && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Answer</h6>
                            <div className="bg-green-50 p-2 rounded text-sm">
                              <LaTeXRenderer content={part.answer_text} />
                            </div>
                          </div>
                        )}

                        {/* Part Rubric */}
                        {showRubric && part.rubric_text && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Grading Rubric</h6>
                            <div className="bg-yellow-50 p-2 rounded text-sm">
                              <LaTeXRenderer content={part.rubric_text} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleQuestion;
