'use client';

import { useState, use } from 'react';
import { trpc } from '@/app/_trpc/client';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, BookOpen, Brain, ArrowLeft, ArrowRight, X } from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import { Ghost } from 'lucide-react';
import Flashcard from '@/components/Flashcard';
import Link from 'next/link';

export default function FlashcardsPage({
  params,
}: {
  params: Promise<{ fileid: string }>;
}) {
  const resolvedParams = use(params);
  const [currentlyDeletingFlashcard, setCurrentlyDeletingFlashcard] =
    useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ question: '', answer: '' });
  
  // ✅ Review mode state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewResults, setReviewResults] = useState<{ [key: string]: 'correct' | 'incorrect' }>({});

  const utils = trpc.useUtils();

  const { data: flashcards, isLoading } =
    trpc.getFlashcardsByFileId.useQuery({
      fileId: resolvedParams.fileid,
    });

  const createFlashcard = trpc.createFlashcard.useMutation({
    onSuccess: () => {
      utils.getFlashcardsByFileId.invalidate({ fileId: resolvedParams.fileid });
      setForm({ question: '', answer: '' });
      setIsCreating(false);
    },
  });

  const updateFlashcard = trpc.updateFlashcard.useMutation({
    onSuccess: () => {
      utils.getFlashcardsByFileId.invalidate({ fileId: resolvedParams.fileid });
      setIsEditing(null);
      setForm({ question: '', answer: '' });
    },
  });

  const { mutate: deleteFlashcard } = trpc.deleteFlashcard.useMutation({
    onSuccess: () => {
      utils.getFlashcardsByFileId.invalidate({ fileId: resolvedParams.fileid });
    },
    onMutate: (vars) => {
      if (vars) setCurrentlyDeletingFlashcard(vars.id);
    },
    onSettled: () => {
      setCurrentlyDeletingFlashcard(null);
    },
  });

  const handleSubmit = () => {
    if (isEditing) {
      updateFlashcard.mutate({
        id: isEditing,
        question: form.question,
        answer: form.answer,
      });
    } else {
      createFlashcard.mutate({
        fileId: resolvedParams.fileid,
        question: form.question,
        answer: form.answer,
      });
    }
  };

  // ✅ Review mode functions
  const startReview = () => {
    setIsReviewMode(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setReviewResults({});
  };

  const exitReview = () => {
    setIsReviewMode(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setReviewResults({});
  };

  const markCard = (result: 'correct' | 'incorrect') => {
    if (!flashcards) return;
    
    const currentCard = flashcards[currentCardIndex];
    setReviewResults(prev => ({ ...prev, [currentCard.id!]: result }));
    
    // Move to next card
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const goToNextCard = () => {
    if (flashcards && currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  };

  // ✅ Calculate review stats
  const getReviewStats = () => {
    const correct = Object.values(reviewResults).filter(r => r === 'correct').length;
    const incorrect = Object.values(reviewResults).filter(r => r === 'incorrect').length;
    const total = flashcards?.length || 0;
    return { correct, incorrect, total, remaining: total - correct - incorrect };
  };

  // ✅ Review Mode UI
  if (isReviewMode && flashcards && flashcards.length > 0) {
    const currentCard = flashcards[currentCardIndex];
    const stats = getReviewStats();
    const isLastCard = currentCardIndex === flashcards.length - 1;
    const allReviewed = stats.remaining === 0;

    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Review Mode</h1>
          <Button variant="outline" onClick={exitReview}>
            <X className="h-4 w-4 mr-2" />
            Exit Review
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
            <div className="flex gap-4">
              <span className="text-green-600">✓ {stats.correct}</span>
              <span className="text-red-600">✗ {stats.incorrect}</span>
              <span className="text-gray-600">Remaining: {stats.remaining}</span>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all" 
              style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000">
          <div 
            className="relative min-h-[400px] bg-white border-2 border-gray-200 rounded-xl shadow-lg p-8 cursor-pointer transition-transform hover:scale-105"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-gray-500 mb-4">
                {showAnswer ? 'Answer' : 'Question'}
              </p>
              <p className="text-xl font-medium">
                {showAnswer ? currentCard.answer : currentCard.question}
              </p>
              <p className="text-sm text-gray-400 mt-6">
                Click to {showAnswer ? 'hide' : 'reveal'} answer
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-4">
          {showAnswer && !reviewResults[currentCard.id!] && (
            <div className="flex gap-4">
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => markCard('incorrect')}
              >
                ✗ Incorrect
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => markCard('correct')}
              >
                ✓ Correct
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={goToPrevCard}
              disabled={currentCardIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={goToNextCard}
              disabled={isLastCard}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {allReviewed && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
              <h3 className="text-2xl font-bold mb-2">Review Complete! 🎉</h3>
              <p className="text-lg mb-4">
                Score: {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={startReview}>
                  Review Again
                </Button>
                <Button variant="outline" onClick={exitReview}>
                  Back to List
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ Normal List View
  return (
    <div className="container mx-auto py-8">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${resolvedParams.fileid}`}>
            <Button variant="outline" size="sm">
              <BookOpen className="h-4 w-4 mr-2" />
              Back to PDF
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Flashcards</h1>
        </div>
        <div className="flex gap-2">
          {flashcards && flashcards.length > 0 && (
            <Button onClick={startReview} variant="default">
              <Brain className="h-4 w-4 mr-2" />
              Review Flashcards
            </Button>
          )}
          <Button onClick={() => setIsCreating(!isCreating)}>
            <Plus className="h-4 w-4 mr-2" /> Add Flashcard
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || isEditing) && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">
            {isEditing ? 'Edit Flashcard' : 'New Flashcard'}
          </h3>
          <input
            placeholder="Question"
            className="w-full mb-2 p-2 border rounded"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
          />
          <textarea
            placeholder="Answer"
            className="w-full mb-2 p-2 border rounded min-h-[100px]"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={createFlashcard.isPending || updateFlashcard.isPending}
            >
              {createFlashcard.isPending || updateFlashcard.isPending ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                'Save'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setIsEditing(null);
                setForm({ question: '', answer: '' });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

{/* Flashcards Grid - Card-style layout */}
{flashcards && flashcards.length !== 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {flashcards
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .map((flashcard) => (
        <Flashcard
          key={flashcard.id!}
          flashcard={{
            id: flashcard.id!,
            question: flashcard.question || '',
            answer: flashcard.answer || '',
            createdAt: flashcard.createdAt!,
            fileName: '',
          }}
          onDelete={(idObj) => deleteFlashcard(idObj)}
          onEdit={(id, question, answer) => {
            setIsEditing(id);
            setForm({ question, answer });
          }}
          deletingId={currentlyDeletingFlashcard}
          isDeleting={!!currentlyDeletingFlashcard}
        />
      ))}
  </div>
) : isLoading ? (
  <Skeleton height={400} className="my-2" count={3} />
) : (
  <div className="mt-16 flex flex-col items-center gap-2">
    <Ghost className="h-8 w-8 text-zinc-800" />
    <h3 className="font-semibold text-xl">No flashcards yet</h3>
    <p>Generate or add some flashcards first.</p>
  </div>
)}
    </div>
  );
}