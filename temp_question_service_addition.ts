  // Fallback method for exam questions when test_type is not properly set
  static async getExamQuestionsFallback(
    category: 'ANG' | 'CG' | 'LOG',
    examType?: 'CM' | 'CMS' | 'CS',
    limit: number = 20
  ): Promise<Question[]> {
    try {
      console.log(`🔍 Fallback: Looking for ${category} questions for exam ${examType}`);
      
      let query = supabase
        .from('questions')
        .select('*')
        .eq('category', category);

      if (examType) {
        query = query.eq('exam_type', examType);
      }

      const { data, error } = await query
        .limit(limit * 2) // Get more questions to ensure we have enough
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching exam questions fallback:', error);
        return [];
      }

      const questions = data || [];
      console.log(`✅ Fallback: Found ${questions.length} questions for ${category}`);
      
      // Shuffle and return the requested limit
      const shuffled = questions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit);
    } catch (error) {
      console.error('Error in getExamQuestionsFallback:', error);
      return [];
    }
  }
}
