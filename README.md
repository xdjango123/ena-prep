# PrepaENA - Plateforme de Préparation aux Concours ENA

Une plateforme moderne de préparation aux concours ENA avec authentification Supabase et suivi de progression personnalisé.

## 🚀 Fonctionnalités

### Authentification et Gestion des Utilisateurs
- **Inscription/Connexion** via Supabase Auth
- **Profils utilisateurs** avec informations personnelles
- **Abonnements** avec différents niveaux d'accès (CM, CMS, CS)
- **Protection des routes** pour les utilisateurs authentifiés

### Quiz et Tests
- **Quiz gratuit** accessible sans inscription
- **Tests de pratique** pour les utilisateurs inscrits
- **Examens blancs** en conditions réelles
- **Questions avec passages** pour les textes longs
- **Suivi des résultats** et progression

### Gestion des Données
- **Tracking des visiteurs** anonymes
- **Stockage des résultats** de tests
- **Questions dynamiques** depuis la base de données
- **Passages de texte** pour questions complexes
- **Logs d'emails** pour suivi des communications
- **Statistiques personnalisées**

## 🛠 Technologies Utilisées

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Animations**: Framer Motion
- **Formulaires**: React Hook Form + Zod
- **Routing**: React Router DOM
- **Icons**: Lucide React

## 📦 Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd ena/project
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Supabase**
Créer un fichier `.env.local` à la racine du projet :
```env
VITE_SUPABASE_URL=https://ohngxnhnbwnystzkqzwy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9obmd4bmhuYndueXN0emtxend5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTc2MzcsImV4cCI6MjA2NzQzMzYzN30.Epn0NnYiDRQh9NM3XRbe5j3YH6fuvQfX-UivRuQ8Sbk
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

## 🗄 Structure de la Base de Données

### Tables Principales

#### Table Purposes:
- **`test_results`**: Simple score tracking for statistics and analytics
- **`user_attempts`**: Detailed test data storage for review functionality
- **`questions`**: Question bank for all subjects
- **`profiles`**: User profile information

#### `auth.users` (Supabase Auth)
- Gestion automatique des utilisateurs
- Email, mot de passe, métadonnées

#### `profiles`
```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT auth.uid(),
  "First Name" text NOT NULL,
  "Last Name" text,
  exam_type text CHECK (exam_type IN ('CM', 'CMS', 'CS', 'ALL')),
  email text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_owner boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
);
```

#### `subscriptions`
```sql
CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  start_date timestamp with time zone DEFAULT now(),
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
```

#### `visitors`
```sql
CREATE TABLE public.visitors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text,
  device_info jsonb,
  created_at timestamp with time zone DEFAULT now(),
  "quizQuiz Score" real,
  "quickQuiz submit time" timestamp without time zone
);
```

#### `test_results` (Score Tracking)
```sql
CREATE TABLE public.test_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type text CHECK (test_type IN ('quick', 'practice', 'exam')),
  category text CHECK (category IN ('ANG', 'CG', 'LOG')),
  test_number integer,
  score integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
```

#### `questions`
```sql
CREATE TABLE public.questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text CHECK (category IN ('ANG', 'CG', 'LOG')),
  sub_category text,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation text,
  difficulty_level text CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  passage_id uuid REFERENCES passages(id),
  created_at timestamp with time zone DEFAULT now()
);
```

#### `passages` (Nouveau)
```sql
CREATE TABLE public.passages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  content text NOT NULL,
  category text CHECK (category IN ('ANG', 'CG', 'LOG')),
  sub_category text,
  difficulty_level text CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  created_at timestamp with time zone DEFAULT now()
);
```

#### `user_attempts` (Detailed Test Data)
```sql
CREATE TABLE public.user_attempts (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id),
  test_type text,
  category text,
  sub_category text,
  test_number smallint,
  score real,
  test_data jsonb, -- Stores detailed test data for review (questions, answers, etc.)
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
```

#### `email_logs` (Nouveau)
```sql
CREATE TABLE public.email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  type text,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  status text
);
```

## 🔧 Services et Contextes

### Services Principaux

#### `SupabaseAuthContext`
- Gestion de l'authentification Supabase
- État global de l'utilisateur
- Méthodes de connexion/déconnexion/inscription
- Logging automatique des tentatives utilisateur

#### `VisitorService`
- Tracking des visiteurs anonymes
- Stockage des résultats de quiz gratuits
- Association visiteur → utilisateur

#### `TestResultService`
- Sauvegarde des résultats de tests
- Calcul des moyennes et statistiques
- Récupération de l'historique

#### `QuestionService` (Mis à jour)
- Récupération des questions depuis la DB
- Questions aléatoires par catégorie
- **Support des passages** pour questions complexes
- Filtrage par difficulté

#### `UserAttemptService` (Nouveau)
- Tracking détaillé des tentatives utilisateur
- Statistiques par catégorie et type de test
- Calcul des scores moyens et meilleurs scores

#### `EmailLogService` (Nouveau)
- Logging des communications email
- Suivi des emails de bienvenue, réinitialisation, etc.
- Statistiques d'envoi

### Workflow d'Intégration

#### 1. Inscription Utilisateur
```typescript
// SignupPage.tsx
const { signUp } = useSupabaseAuth();

const handleSignup = async (data) => {
  const { error } = await signUp(
    data.email,
    data.password,
    data.firstName,
    data.lastName,
    data.examType,
    planName
  );
  
  if (!error) {
    // Création automatique du profil, abonnement et log email
    navigate('/dashboard');
  }
};
```

#### 2. Quiz Gratuit (Visiteurs)
```typescript
// QuickQuizPage.tsx
useEffect(() => {
  const trackVisitor = async () => {
    const visitorId = await VisitorService.trackVisitor();
    setVisitorId(visitorId);
  };
  trackVisitor();
}, []);

const handleFinishQuiz = async () => {
  const score = calculateScore();
  
  if (user) {
    // Utilisateur connecté → test_results + user_attempts
    await TestResultService.saveTestResult(user.id, 'Quick', 'CG', score.percentage);
    await logUserAttempt('Quick', 'CG', undefined, undefined, score.percentage);
  } else if (visitorId) {
    // Visiteur anonyme → visitors
    await VisitorService.updateQuizResult(visitorId, score.percentage);
  }
};
```

#### 3. Questions avec Passages
```typescript
// QuestionService.ts
const questionsWithPassages = await QuestionService.getQuestionsWithPassages('CG', 10);

// QuestionWithPassageComponent.tsx
<QuestionWithPassageComponent
  questionWithPassage={questionWithPassage}
  userAnswer={userAnswer}
  onAnswerSelect={handleAnswerSelect}
  showCorrectAnswer={isReviewMode}
  isReviewMode={isReviewMode}
/>
```

#### 4. Tests de Pratique
```typescript
// PracticePage.tsx
const [questions, setQuestions] = useState([]);

useEffect(() => {
  const loadQuestions = async () => {
    // Questions avec passages si disponibles
    const questions = await QuestionService.getRandomQuestionsWithPassages('CG', 10);
    setQuestions(questions);
  };
  loadQuestions();
}, []);

const handleTestComplete = async (score) => {
  await TestResultService.saveTestResult(
    user.id,
    'Practice',
    'CG',
    score,
    testNumber
  );
  
  // Log de la tentative
  await logUserAttempt('Practice', 'CG', subCategory, testNumber, score);
};
```

## 🎯 Fonctionnalités par Niveau d'Accès

### Visiteurs (Non inscrits)
- ✅ Quiz gratuit (15 questions, 10 min)
- ✅ Tracking anonyme
- ✅ Questions avec passages
- ❌ Tests de pratique
- ❌ Examens blancs
- ❌ Suivi de progression

### Utilisateurs Inscrits
- ✅ Quiz gratuit
- ✅ Tests de pratique (selon abonnement)
- ✅ Questions avec passages
- ✅ Suivi de progression
- ✅ Profil personnalisé
- ✅ Logs de tentatives
- ❌ Examens blancs (selon abonnement)

### Abonnements
- **Prépa CM**: Accès aux questions CM uniquement
- **Prépa CMS**: Accès aux questions CMS uniquement  
- **Prépa CS**: Accès aux questions CS uniquement

## 🔒 Sécurité

### Authentification
- JWT tokens via Supabase Auth
- Sessions sécurisées
- Protection des routes sensibles

### Base de Données
- RLS (Row Level Security) activé
- Contraintes de validation
- Clés étrangères avec CASCADE

### Validation
- Zod schemas pour les formulaires
- Validation côté client et serveur
- Sanitisation des entrées

## 🚀 Déploiement

### Build de Production
```bash
npm run build
```

### Variables d'Environnement
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Déploiement Vercel
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

## 📊 Monitoring et Analytics

### Métriques Suivies
- Nombre de visiteurs uniques
- Taux de conversion (visiteur → inscrit)
- Scores moyens par catégorie
- Temps passé sur les tests
- Questions les plus difficiles
- **Tentatives utilisateur détaillées**
- **Logs d'emails et communications**

### Logs
- Erreurs d'authentification
- Échecs de sauvegarde des résultats
- Problèmes de connexion DB
- **Tentatives utilisateur**
- **Envois d'emails**

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement
- Consulter la documentation Supabase

---

**Développé avec ❤️ pour la réussite des candidats ENA** 