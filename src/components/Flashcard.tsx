'use client';

import { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { Button } from './ui/button';

interface FlashcardProps {
  flashcard: {
    id: string;
    question: string;
    answer: string;
    createdAt: string;
    fileName: string;
  };
  onDelete: (id: { id: string }) => void;
  onEdit: (id: string, question: string, answer: string) => void;
  deletingId: string | null;
  isDeleting: boolean;
}

const Flashcard = ({ flashcard, onDelete, onEdit, deletingId, isDeleting }: FlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto h-[400px] perspective-1000">
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front Side - Question */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-lg flex flex-col overflow-hidden ${
            isFlipped ? 'invisible' : ''
          }`}
        >
          <div className="flex justify-between items-start p-4 flex-shrink-0">
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
              QUESTION
            </span>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(flashcard.id, flashcard.question, flashcard.answer)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete({ id: flashcard.id })}
                disabled={isDeleting && deletingId === flashcard.id}
                className="h-8 w-8 p-0"
              >
                {isDeleting && deletingId === flashcard.id ? (
                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-600" />
                )}
              </Button>
            </div>
          </div>

          {/* ✅ Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center justify-center">
            <div className="text-center w-full">
              <p className="text-xl font-semibold text-gray-800 break-words">
                {flashcard.question}
              </p>
            </div>
          </div>

          <div className="text-center p-4 flex-shrink-0">
            <p className="text-sm text-gray-500">Click to reveal answer</p>
          </div>
        </div>

        {/* Back Side - Answer */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-green-50 to-teal-50 border-2 border-green-200 rounded-xl shadow-lg flex flex-col overflow-hidden rotate-y-180 ${
            !isFlipped ? 'invisible' : ''
          }`}
        >
          <div className="flex justify-between items-start p-4 flex-shrink-0">
            <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
              ANSWER
            </span>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(flashcard.id, flashcard.question, flashcard.answer)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete({ id: flashcard.id })}
                disabled={isDeleting && deletingId === flashcard.id}
                className="h-8 w-8 p-0"
              >
                {isDeleting && deletingId === flashcard.id ? (
                  <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-600" />
                )}
              </Button>
            </div>
          </div>

          {/* ✅ Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex items-center justify-center">
            <div className="text-center w-full">
              <p className="text-lg text-gray-800 break-words">
                {flashcard.answer}
              </p>
            </div>
          </div>

          <div className="text-center p-4 flex-shrink-0">
            <p className="text-sm text-gray-500">Click to see question</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;