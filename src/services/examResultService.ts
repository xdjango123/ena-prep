import { supabase } from '../lib/supabase';

export interface ExamResult {
  id: string;
  user_id: string;
  test_type: string;
  category: string | null; // null for overall score, 'ANG'/'CG'/'LOG' for subject scores
  test_number: number;
  score: number;
  exam_type: 'CM' | 'CMS' | 'CS';
  created_at: string;
}

export class ExamResultService {
  /**
   * Save exam result to database using test_results table
   */
  static async saveExamResult(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number,
    overallScore: number,
    subjectScores: { ANG: number; CG: number; LOG: number },
    userAnswers?: Map<string, string>
  ): Promise<boolean> {
    try {
      console.log('Saving exam result:', { userId, examType, examNumber, overallScore, subjectScores });

      // First, delete any existing results for this exam
      const { error: deleteError } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('test_number', examNumber)
        .eq('exam_type', examType);

      if (deleteError) {
        console.error('Error deleting existing exam results:', deleteError);
      }

      // Prepare results to insert
      const resultsToInsert = [
        // Overall score (category = 'OVERALL')
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'OVERALL',
          test_number: examNumber,
          score: overallScore,
          exam_type: examType
        },
        // Subject scores
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'ANG',
          test_number: examNumber,
          score: subjectScores.ANG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'CG',
          test_number: examNumber,
          score: subjectScores.CG,
          exam_type: examType
        },
        {
          user_id: userId,
          test_type: 'examen_blanc',
          category: 'LOG',
          test_number: examNumber,
          score: subjectScores.LOG,
          exam_type: examType
        }
      ];

      // Save user answers to user_attempts table if provided
      if (userAnswers) {
        try {
          const { UserAttemptService } = await import('./userAttemptService');
          
          // Convert Map to array format expected by UserAttemptService
          const userAnswersArray: [number, string | number][] = [];
          userAnswers.forEach((answer, questionId) => {
            userAnswersArray.push([parseInt(questionId), answer]);
          });
          
          console.log('💾 Saving user answers:', userAnswersArray.length, 'answers');
          
          await UserAttemptService.saveUserAttempt(
            userId,
            'examen_blanc',
            'OVERALL',
            undefined,
            examNumber,
            overallScore,
            {
              questions: [], // We don't need to store questions here
              userAnswers: userAnswersArray,
              correctAnswers: Math.round((overallScore / 100) * userAnswers.size),
              totalQuestions: userAnswers.size,
              timeSpent: 0 // We don't track time spent in this context
            }
          );
          
          console.log('✅ User answers saved successfully');
        } catch (error) {
          console.error('❌ Error saving user answers:', error);
        }
      }

      // Insert all results
      console.log('📝 Inserting exam results:', resultsToInsert.length, 'records');
      console.log('📝 Data to insert:', JSON.stringify(resultsToInsert, null, 2));
      
      const { data, error } = await supabase
        .from('test_results')
        .insert(resultsToInsert)
        .select();

      if (error) {
        console.error('❌ Error saving exam results:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        return false;
      }

      console.log('✅ Successfully saved exam results:', data);
      return true;

    } catch (error) {
      console.error('Error in saveExamResult:', error);
      return false;
    }
  }

  /**
   * Get exam result for a specific exam (overall score)
   */
  static async getExamResult(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<ExamResult | null> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber)
        .eq('category', 'OVERALL') // Get overall score
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        console.error('Error fetching exam result:', error);
        return null;
      }

      return data as ExamResult;

    } catch (error) {
      console.error('Error in getExamResult:', error);
      return null;
    }
  }

  /**
   * Get all exam results for a user (overall scores only)
   */
  static async getUserExamResults(userId: string): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('category', 'OVERALL') // Only overall scores
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user exam results:', error);
        return [];
      }

      return data as ExamResult[];

    } catch (error) {
      console.error('Error in getUserExamResults:', error);
      return [];
    }
  }

  /**
   * Get exam results by exam type (overall scores only)
   */
  static async getExamResultsByType(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS'
  ): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('category', 'OVERALL') // Only overall scores
        .order('test_number', { ascending: true });

      if (error) {
        console.error('Error fetching exam results by type:', error);
        return [];
      }

      return data as ExamResult[];

    } catch (error) {
      console.error('Error in getExamResultsByType:', error);
      return [];
    }
  }

  /**
   * Delete exam result (for retaking)
   */
  static async deleteExamResult(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('user_id', userId)
        .eq('test_type', 'examen_blanc')
        .eq('exam_type', examType)
        .eq('test_number', examNumber);

      if (error) {
        console.error('Error deleting exam result:', error);
        return false;
      }

      // Also delete user answers from user_attempts
      try {
        const { UserAttemptService } = await import('./userAttemptService');
        // UserAttemptService doesn't have a delete method, but it overwrites on save
        // So we don't need to explicitly delete here
      } catch (error) {
        console.error('Error cleaning up user answers:', error);
      }

      return true;

    } catch (error) {
      console.error('Error in deleteExamResult:', error);
      return false;
    }
  }

  /**
   * Get user answers for an exam
   */
  static async getUserAnswers(
    userId: string,
    examType: 'CM' | 'CMS' | 'CS',
    examNumber: number
  ): Promise<Map<string, string>> {
    try {
      const { UserAttemptService } = await import('./userAttemptService');
      const attempts = await UserAttemptService.getUserAttempts(userId);
      
      console.log('🔍 All user attempts:', attempts.length);
      console.log('🔍 Looking for examen_blanc, test_number:', examNumber);
      
      // Find the attempt for this exam
      const examAttempt = attempts.find(attempt => 
        attempt.test_type === 'examen_blanc' && 
        attempt.test_number === examNumber
      );
      
      console.log('🔍 Found exam attempt:', examAttempt ? 'YES' : 'NO');
      if (examAttempt) {
        console.log('🔍 Exam attempt details:', {
          id: examAttempt.id,
          test_type: examAttempt.test_type,
          test_number: examAttempt.test_number,
          has_test_data: !!examAttempt.test_data,
          has_userAnswers: !!(examAttempt.test_data && examAttempt.test_data.userAnswers)
        });
      }

      if (examAttempt && examAttempt.test_data && examAttempt.test_data.userAnswers) {
        console.log('🔍 Found exam attempt with user answers:', examAttempt.test_data.userAnswers.length);
        const userAnswersMap = new Map<string, string>();
        examAttempt.test_data.userAnswers.forEach(([questionId, answer], index) => {
          console.log(`  Answer ${index + 1}: questionId=${questionId}, answer=${answer}`);
          // Check for null/undefined values before converting to string
          if (questionId !== null && questionId !== undefined && 
              answer !== null && answer !== undefined) {
            
            // Convert number answers to letters (0=A, 1=B, 2=C)
            let letterAnswer: string;
            if (typeof answer === 'number' && answer >= 0 && answer <= 2) {
              letterAnswer = String.fromCharCode(65 + answer); // 0->A, 1->B, 2->C
              console.log(`    Converted number ${answer} to letter ${letterAnswer}`);
            } else {
              letterAnswer = answer.toString();
            }
            
            userAnswersMap.set(questionId.toString(), letterAnswer);
          } else {
            console.log(`  Skipping invalid answer: questionId=${questionId}, answer=${answer}`);
          }
        });
        console.log('📊 Final user answers map:', userAnswersMap.size, 'answers');
        return userAnswersMap;
      }

      return new Map();

    } catch (error) {
      console.error('Error getting user answers:', error);
      return new Map();
    }
  }
}
