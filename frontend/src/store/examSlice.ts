import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Question {
  id: string
  type: 'single' | 'multiple' | 'blank' | 'essay'
  content: string
  options?: string[]
  score: number
}

interface Exam {
  id: string
  title: string
  subject: string
  duration: number
  totalScore: number
  questions: Question[]
}

interface ExamState {
  currentExam: Exam | null
  answers: Record<string, any>
  timeRemaining: number
  isSubmitting: boolean
}

const initialState: ExamState = {
  currentExam: null,
  answers: {},
  timeRemaining: 0,
  isSubmitting: false,
};

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    setCurrentExam: (state, action: PayloadAction<Exam>) => {
      state.currentExam = action.payload;
      state.timeRemaining = action.payload.duration * 60;
    },
    updateAnswer: (state, action: PayloadAction<{ questionId: string; answer: any }>) => {
      state.answers[action.payload.questionId] = action.payload.answer;
    },
    decrementTime: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },
    submitExam: (state) => {
      state.isSubmitting = true;
    },
    resetExam: (state) => {
      state.currentExam = null;
      state.answers = {};
      state.timeRemaining = 0;
      state.isSubmitting = false;
    },
  },
});

export const { setCurrentExam, updateAnswer, decrementTime, submitExam, resetExam } = examSlice.actions;
export default examSlice.reducer;