import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import axios from 'axios';


const app = express();
const PORT = 3000;

// Middleware
app.use(cors({
    origin: process.env.VERCEL_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('static'));

// Add middleware to create Groq instance for each request
app.use((req, res, next) => {
    const apiKey = req.headers['x-groq-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    // Create a new Groq instance for this request
    req.groq = new Groq({ apiKey });
    next();
});

// Add test connection endpoint
app.post('/api/test-connection', async (req, res) => {
    const apiKey = req.headers['x-groq-api-key'];
    
    if (!apiKey) {
        return res.json({ success: false, error: 'API key required' });
    }

    try {
        const groq = new Groq({
            apiKey: apiKey
        });
        
        // Test the connection with a simple request
        await groq.chat.completions.create({
            messages: [{ role: "user", content: "test" }],
            model: "llama-3.1-70b-versatile",
            max_tokens: 1
        });
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Language personality profiles
/*    en: 'English',
    fr: 'French',
    es: 'Spanish',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese',
    hu: 'Hungarian',
    */
const languagePersonalities = {
    'English': 'a British linguistics professor',
    'French': 'a Parisian language expert',
    'Spanish': 'a Madrid-based language instructor',
    'German': 'a Berlin university professor',
    'Japanese': 'a Tokyo linguistics specialist',
    'Hungarian': 'a Budapest language expert',
    'Chinese': 'a Beijing language expert',
    'Korean': 'a Seoul language expert',
    'Portuguese': 'a Lisbon language expert',
    'Russian': 'a Moscow language expert',
    'Italian': 'a Rome language expert',

    // Add more languages as needed
};

// Add rate limiting configuration
const rateLimits = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // limit each IP to 100 requests per windowMs
};

// Add rate limit configuration
const RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later.'
};

// Add error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);

    // Rate limit error
    if (error.type === 'rate_limit_exceeded') {
        return res.status(429).json({
            success: false,
            error: RATE_LIMIT.message,
            retryAfter: error.retryAfter,
            fallbackQuestions: getFallbackQuestions(req.query.language || 'English')
        });
    }

    // GROQ API errors
    if (error.status === 400) {
        return res.status(200).json({
            success: true,
            warning: 'Using fallback questions due to generation error',
            questions: getFallbackQuestions(req.query.language || 'English'),
            retryAvailable: true
        });
    }

    // Generic error response
    res.status(500).json({
        success: false,
        error: 'An unexpected error occurred',
        fallbackQuestions: getFallbackQuestions(req.query.language || 'English'),
        retryAvailable: true
    });
};

// Modified validateLanguageAndGrammar function with better error handling
async function validateLanguageAndGrammar(questions, language) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return questions;
    }

    try {
        // Enhanced validation prompt with specific grammar rules
        const validationPrompt = `
You are a professional ${languagePersonalities[language]} specializing in grammar and spelling.
Please review and correct these quiz questions following these rules:

1. Check for proper capitalization rules in ${language}
2. Verify correct punctuation and spacing
3. Ensure proper word order according to ${language} grammar
4. Check for common grammatical mistakes in ${language}
5. Maintain formal/academic language style
6. Preserve technical terms and proper nouns
7. Keep consistent tense usage
8. Verify question word usage (e.g., "Mi" vs "Milyen" in Hungarian)

Input JSON: ${JSON.stringify({questions: questions})}

Return the corrected questions in the same JSON format, maintaining the exact same structure.
Each correction should follow ${language} academic standards.
`;

        const chatCompletion = await req.groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an expert ${language} language validator with deep knowledge of:
                    - Academic writing standards
                    - Common grammatical errors
                    - Proper punctuation rules
                    - Formal language requirements
                    Always return valid JSON with carefully corrected grammar and language.`
                },
                {
                    role: "user",
                    content: validationPrompt
                }
            ],
            model: "llama-3.1-70b-versatile",
            temperature: 0.1, // Lower temperature for more consistent corrections
            max_tokens: 2048,
            response_format: { type: "json_object" }
        });

        const validatedResponse = JSON.parse(chatCompletion.choices[0].message.content);
        
        // Additional validation layer for specific language rules
        if (validatedResponse.questions && Array.isArray(validatedResponse.questions)) {
            validatedResponse.questions = validatedResponse.questions.map(q => ({
                ...q,
                question: applyLanguageSpecificRules(q.question, language),
                options: q.options.map(opt => applyLanguageSpecificRules(opt, language)),
                explanation: applyLanguageSpecificRules(q.explanation, language)
            }));
            return validatedResponse.questions;
        }

        return questions;

    } catch (error) {
        console.error('Language validation error:', error);
        return questions;
    }
}

// New helper function for language-specific rules
function applyLanguageSpecificRules(text, language) {
    switch (language) {
        case 'Hungarian':
            return applyHungarianRules(text);
        case 'German':
            return applyGermanRules(text);
        // Add more languages as needed
        default:
            return text;
    }
}

// Language-specific rule functions
function applyHungarianRules(text) {
    // Common Hungarian corrections
    const rules = [
        // Question word corrections
        { pattern: /^Milyen volt/i, replacement: 'Mi volt' },
        { pattern: /^Melyik volt/i, replacement: 'Mi volt' },
        
        // Capitalization rules
        { pattern: /Római Birodalom/g, replacement: 'Római birodalom' },
        
        // Common article corrections
        { pattern: / a az /g, replacement: ' az ' },
        { pattern: / az a /g, replacement: ' a ' },
        
        // Punctuation rules
        { pattern: /\s+[?]/g, replacement: '?' },
        { pattern: /\s+[!]/g, replacement: '!' },
        { pattern: /\s+[.]/g, replacement: '.' }
    ];

    return rules.reduce((text, rule) => {
        return text.replace(rule.pattern, rule.replacement);
    }, text);
}

function applyGermanRules(text) {
    // Common German corrections
    const rules = [
        // Capitalize all nouns
        // Add specific German grammar rules
        { pattern: /(?<=\s)(haus|stadt|buch)(?=\s|$)/gi, replacement: (match) => match.charAt(0).toUpperCase() + match.slice(1) },
        
        // Article corrections
        { pattern: / der die /g, replacement: ' die ' },
        { pattern: / die der /g, replacement: ' der ' },
        
        // Punctuation rules
        { pattern: /\s+[?]/g, replacement: '?' }
    ];

    return rules.reduce((text, rule) => {
        return text.replace(rule.pattern, rule.replacement);
    }, text);
}

// Add category definitions
const categoryStructure = {
    'Science': {
        subCategories: {
            'Space & Astronomy': ['Planets', 'Stars', 'Space Exploration', 'Solar System', 'Galaxies', 'Astronauts', 'Space Technology', 'Cosmic Phenomena', 'Space History', 'Space Missions'],
            'Biology': ['Human Body', 'Animals', 'Plants', 'Ecosystems', 'Cells', 'Evolution', 'Genetics', 'Marine Life', 'Insects', 'Dinosaurs'],
            'Chemistry': ['Elements', 'Reactions', 'Materials', 'Lab Safety', 'Everyday Chemistry', 'Environmental Chemistry', 'Food Chemistry', 'Chemical Properties', 'Mixtures', 'States of Matter'],
            'Physics': ['Forces', 'Energy', 'Light', 'Sound', 'Electricity', 'Magnetism', 'Simple Machines', 'Motion', 'Heat', 'Gravity'],
            'Earth Science': ['Weather', 'Geology', 'Oceans', 'Climate', 'Natural Disasters', 'Volcanoes', 'Earthquakes', 'Atmosphere', 'Seasons', 'Water Cycle']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    },
    'Technology': {
        subCategories: {
            'Computers': ['Hardware', 'Software', 'Internet Safety', 'Programming Basics', 'Digital Art', 'Web Browsers', 'Operating Systems', 'Computer History', 'Gaming', 'Digital Ethics'],
            'Robotics': ['Robot Types', 'AI Basics', 'Sensors', 'Robot Movement', 'Programming Robots', 'Robot Applications', 'Famous Robots', 'Robot Safety', 'Robot Design', 'Future of Robotics'],
            'Digital Media': ['Social Media Safety', 'Digital Photography', 'Video Creation', 'Animation', 'Sound Design', 'Online Communication', 'Digital Art Tools', 'Content Creation', 'Media Literacy', 'Online Privacy'],
            'Inventions': ['Famous Inventors', 'Modern Gadgets', 'Future Technology', 'Innovation Process', 'Problem Solving', 'Tech Evolution', 'Green Technology', 'Communication Devices', 'Transportation Tech', 'Medical Technology']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    },
    'Mathematics': {
        subCategories: {
            'Numbers & Operations': ['Basic Math', 'Decimals', 'Fractions', 'Percentages', 'Mental Math', 'Word Problems', 'Number Patterns', 'Place Value', 'Operations Order', 'Math Games'],
            'Geometry': ['Shapes', '3D Objects', 'Angles', 'Measurements', 'Symmetry', 'Transformations', 'Geometric Patterns', 'Area & Perimeter', 'Volume', 'Geometric Art'],
            'Algebra Basics': ['Patterns', 'Variables', 'Equations', 'Functions', 'Graphs', 'Problem Solving', 'Real-world Applications', 'Number Sequences', 'Mathematical Thinking', 'Logic Puzzles']
        },
        ageGroups: ['kid', 'teen']
    },
    'History & Culture': {
        subCategories: {
            'Ancient Civilizations': ['Egypt', 'Greece', 'Rome', 'Maya', 'Inca', 'China', 'India', 'Mesopotamia', 'Archaeological Discoveries', 'Daily Life'],
            'World Exploration': ['Famous Explorers', 'Navigation Tools', 'Trade Routes', 'Cultural Exchange', 'Maps & Geography', 'Sea Voyages', 'Land Expeditions', 'Space Exploration', 'Modern Exploration', 'Discovery Stories'],
            'Cultural Traditions': ['Festivals', 'Food & Cuisine', 'Traditional Games', 'Music & Dance', 'Clothing', 'Art & Crafts', 'Languages', 'Celebrations', 'Folklore', 'Cultural Values']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    },
    'Nature & Environment': {
        subCategories: {
            'Wildlife': ['Mammals', 'Birds', 'Reptiles', 'Fish', 'Insects', 'Animal Behavior', 'Endangered Species', 'Habitats', 'Animal Facts', 'Conservation'],
            'Environmental Science': ['Climate Change', 'Recycling', 'Renewable Energy', 'Pollution', 'Conservation', 'Ecosystems', 'Biodiversity', 'Sustainability', 'Environmental Protection', 'Green Living'],
            'Plants & Gardens': ['Plant Types', 'Growing Food', 'Trees', 'Flowers', 'Plant Life Cycle', 'Gardening Basics', 'Plant Care', 'Seeds & Fruits', 'Plant Adaptations', 'Indoor Plants']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    },
    'Arts & Creativity': {
        subCategories: {
            'Visual Arts': ['Drawing', 'Painting', 'Sculpture', 'Digital Art', 'Photography', 'Color Theory', 'Art History', 'Famous Artists', 'Art Techniques', 'Art Styles'],
            'Music': ['Instruments', 'Music Theory', 'Composers', 'Musical Styles', 'World Music', 'Music History', 'Music Technology', 'Song Writing', 'Music Reading', 'Performance'],
            'Performance Arts': ['Theater', 'Dance', 'Animation', 'Film Making', 'Puppetry', 'Stage Design', 'Costume Design', 'Acting', 'Directing', 'Production']
        },
        ageGroups: ['kid', 'teen', 'young adult']
    },
    'Language & Literature': {
        subCategories: {
            'Reading Comprehension': ['Story Elements', 'Main Ideas', 'Character Analysis', 'Plot Development', 'Setting Analysis', 'Theme Recognition', 'Author\'s Purpose', 'Literary Devices', 'Genre Study', 'Reading Strategies'],
            'Writing Skills': ['Grammar Rules', 'Punctuation', 'Sentence Structure', 'Paragraph Writing', 'Essay Writing', 'Creative Writing', 'Poetry', 'Story Writing', 'Report Writing', 'Writing Style'],
            'Vocabulary Building': ['Word Meanings', 'Synonyms & Antonyms', 'Context Clues', 'Word Roots', 'Prefixes & Suffixes', 'Idioms', 'Figurative Language', 'Academic Vocabulary', 'Word Families', 'Language Origins']
        },
        ageGroups: ['kid', 'teen', 'young adult']
    },
    'Social Studies': {
        subCategories: {
            'Geography': ['World Maps', 'Continents', 'Countries', 'Landforms', 'Climate Zones', 'Natural Resources', 'Population Studies', 'Cultural Geography', 'Economic Geography', 'Environmental Geography'],
            'World Cultures': ['Global Traditions', 'World Religions', 'Cultural Customs', 'Traditional Arts', 'World Cuisine', 'Cultural Celebrations', 'Traditional Clothing', 'Cultural Values', 'Cultural Exchange', 'Global Heritage'],
            'Current Events': ['Global News', 'Environmental Issues', 'Social Issues', 'Technology News', 'Scientific Discoveries', 'World Leaders', 'Cultural Events', 'Sports Events', 'Educational News', 'Youth Movements']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    },
    'Health & Wellness': {
        subCategories: {
            'Physical Health': ['Exercise Basics', 'Nutrition', 'Body Systems', 'Sports Science', 'First Aid', 'Personal Hygiene', 'Sleep Health', 'Growth & Development', 'Injury Prevention', 'Health Habits'],
            'Mental Health': ['Emotions', 'Stress Management', 'Social Skills', 'Problem Solving', 'Self-Esteem', 'Communication', 'Friendship Skills', 'Conflict Resolution', 'Decision Making', 'Mindfulness'],
            'Safety & Prevention': ['Internet Safety', 'Personal Safety', 'Emergency Preparedness', 'Bullying Prevention', 'Health Prevention', 'Environmental Safety', 'Road Safety', 'Home Safety', 'School Safety', 'Community Safety']
        },
        ageGroups: ['kid', 'teen', 'young adult']
    },
    'Life Skills': {
        subCategories: {
            'Personal Finance': ['Money Basics', 'Saving', 'Budgeting', 'Banking', 'Smart Shopping', 'Financial Goals', 'Money Management', 'Financial Literacy', 'Consumer Skills', 'Economic Concepts'],
            'Digital Skills': ['Computer Basics', 'Online Research', 'Digital Communication', 'Online Safety', 'Digital Citizenship', 'Media Literacy', 'Digital Tools', 'Information Literacy', 'Digital Creation', 'Online Learning'],
            'Study Skills': ['Time Management', 'Organization', 'Note Taking', 'Test Preparation', 'Research Skills', 'Memory Techniques', 'Learning Styles', 'Goal Setting', 'Project Planning', 'Academic Success']
        },
        ageGroups: ['kid', 'teen', 'young adult']
    },
    'Critical Thinking': {
        subCategories: {
            'Logic & Reasoning': ['Problem Solving', 'Pattern Recognition', 'Logical Thinking', 'Critical Analysis', 'Decision Making', 'Strategic Planning', 'Analytical Skills', 'Deductive Reasoning', 'Creative Solutions', 'Brain Teasers'],
            'Scientific Method': ['Hypothesis Testing', 'Observation Skills', 'Data Collection', 'Analysis Methods', 'Experiment Design', 'Results Interpretation', 'Scientific Reasoning', 'Research Methods', 'Evidence Evaluation', 'Conclusion Drawing'],
            'Creative Problem Solving': ['Innovation', 'Design Thinking', 'Brainstorming', 'Solution Finding', 'Creative Expression', 'Idea Generation', 'Project Design', 'Invention Process', 'Creative Challenges', 'Problem Analysis']
        },
        ageGroups: ['kid', 'teen', 'young adult', 'adult']
    }
};

// Function to get age-appropriate difficulty level
function getDifficultyForAge(ageGroup) {
    switch(ageGroup) {
        case 'kid': // 8-12
            return {
                vocabularyLevel: 'simple',
                conceptComplexity: 'basic',
                questionLength: 'short',
                topicDepth: 'introductory'
            };
        case 'teen': // 13-16
            return {
                vocabularyLevel: 'moderate',
                conceptComplexity: 'intermediate',
                questionLength: 'medium',
                topicDepth: 'detailed'
            };
        case 'young adult': // 17-21
            return {
                vocabularyLevel: 'advanced',
                conceptComplexity: 'challenging',
                questionLength: 'detailed',
                topicDepth: 'comprehensive'
            };
        case 'adult': // 21+
            return {
                vocabularyLevel: 'professional',
                conceptComplexity: 'advanced',
                questionLength: 'complex',
                topicDepth: 'expert'
            };
        default:
            return getDifficultyForAge('teen');
    }
}

// Add these constants near the top of the file
const SERPAPI_KEY = process.env.SERPAPI_KEY; // Free alternative to Google Custom Search
const WIKIPEDIA_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';

// Add this new validation function
async function validateAnswerWithExternalSources(question, correctAnswer) {
    try {
        // First try Wikipedia API
        const wikiResult = await searchWikipedia(question);
        if (wikiResult) {
            const confidence = calculateConfidence(wikiResult, correctAnswer);
            if (confidence > 0.7) {
                return true;
            }
        }

        // Fallback to DuckDuckGo API (no key required)
        const ddgResult = await searchDuckDuckGo(question);
        if (ddgResult) {
            const confidence = calculateConfidence(ddgResult, correctAnswer);
            return confidence > 0.6;
        }

        return true; // Default to trusting AI if no contradicting information found

    } catch (error) {
        console.error('Answer validation error:', error);
        return true; // Default to trusting AI on error
    }
}

// Add these helper functions
async function searchWikipedia(query) {
    try {
        const response = await axios.get(WIKIPEDIA_API_ENDPOINT, {
            params: {
                action: 'query',
                format: 'json',
                list: 'search',
                srsearch: query,
                utf8: 1,
                origin: '*'
            }
        });
        
        return response.data.query.search[0]?.snippet || '';
    } catch (error) {
        console.error('Wikipedia search error:', error);
        return null;
    }
}

async function searchDuckDuckGo(query) {
    try {
        // Using DuckDuckGo Instant Answer API
        const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
        return response.data.AbstractText || '';
    } catch (error) {
        console.error('DuckDuckGo search error:', error);
        return null;
    }
}

function calculateConfidence(searchResult, answer) {
    if (!searchResult || !answer) return 0;
    
    // Convert both texts to lowercase for comparison
    const searchText = searchResult.toLowerCase();
    const answerText = answer.toLowerCase();
    
    // Simple word matching algorithm
    const searchWords = new Set(searchText.split(/\s+/));
    const answerWords = new Set(answerText.split(/\s+/));
    
    let matchCount = 0;
    for (const word of answerWords) {
        if (searchWords.has(word)) matchCount++;
    }
    
    return matchCount / answerWords.size;
}

// Modify the generateQuizQuestions function to include validation
async function generateQuizQuestions(
    mainCategory, 
    subCategory, 
    topic, 
    ageGroup = 'teen', 
    language = 'English',
    groq,
    numQuestions = 10
) {
    try {
        // Add error logging
        console.log('Generating questions with params:', {
            mainCategory,
            subCategory,
            topic,
            ageGroup,
            language
        });

        const difficulty = getDifficultyForAge(ageGroup);
        
        const prompt = `Role: Educational content creator for ${ageGroup}s.
        Topic: ${mainCategory} - ${subCategory} - ${topic}
        
        Create ${numQuestions} multiple-choice questions in ${languageMapping[language] || 'English'}.
        Ensure each question and its options are unique and diverse.
        Avoid similar wording or concepts in questions and options.
        Create exactly ${numQuestions} multiple-choice quiz questions about ${mainCategory} - ${subCategory} - ${topic}.
        Each question must follow this exact JSON structure with English keys:

        {
            "questions": [
                {
                    "question": "Example question?",
                    "options": ["Option 1", "Option 2", "Option 3"],
                    "correct": 0,
                    "explanation": "Explanation for the correct answer"
                }
            ]
        }

        Requirements:
        - Return ONLY valid JSON, no additional text
        - Each question must have EXACTLY 3 options
        - Correct answer index must be 0, 1, or 2
        - Include brief explanations
        - Use ${difficulty.vocabularyLevel} vocabulary
        - Keep content age-appropriate for ${ageGroup}
        - All text must be in ${languageMapping[language] || 'English'}, but JSON keys must be in English
        `;

        // Log the prompt for debugging
        console.log('Generated prompt:', prompt);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are a quiz generator that ONLY responds with valid JSON."
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            model: "llama-3.1-70b-versatile",
            temperature: 0.3,
            max_tokens: 2048,
            response_format: { type: "json_object" }
        });

        // Log raw response
        console.log('Raw API response:', chatCompletion.choices[0].message.content);

        let response;
        try {
            response = JSON.parse(chatCompletion.choices[0].message.content);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            throw new Error('Failed to parse API response as JSON');
        }

        // Validate response structure
        if (!response || !response.questions || !Array.isArray(response.questions)) {
            console.error('Invalid response structure:', response);
            return getFallbackQuestions(language);
        }

        // Validate and clean each question
        const validQuestions = response.questions
            .filter(q => {
                const isValid = 
                    q.question && 
                    Array.isArray(q.options) && 
                    q.options.length === 3 &&
                    typeof q.correct === 'number' &&
                    q.correct >= 0 && 
                    q.correct <= 2 &&
                    q.explanation;
                
                if (!isValid) {
                    console.log('Filtered out invalid question:', q);
                }
                return isValid;
            })
            .map(q => ({
                question: String(q.question).trim(),
                options: q.options.map(opt => String(opt).trim()),
                correct: Number(q.correct),
                explanation: String(q.explanation).trim()
            }));

        if (validQuestions.length === 0) {
            console.error('No valid questions after filtering');
            return getFallbackQuestions(language);
        }

        return validQuestions;

    } catch (error) {
        console.error('Question generation detailed error:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        return getFallbackQuestions(language);
    }
}

// Improved fallback questions function
function getFallbackQuestions(language = 'English') {
    return [
        {
            question: "What is the capital of France?",
            options: ["Paris", "London", "Berlin"],
            correct: 0,
            explanation: "Paris is the capital city of France."
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Mars", "Venus", "Jupiter"],
            correct: 0,
            explanation: "Mars appears red due to iron oxide (rust) on its surface."
        },
        // Add more fallback questions...
    ];
}

// Helper function to translate questions (implement as needed)
function translateQuestions(questions, targetLanguage) {
    // Implement translation logic here if needed
    // For now, return the original questions
    return questions;
}

// Add language mapping
const languageMapping = {
    'en': 'English',
    'fr': 'French',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'hu': 'Hungarian'
};

// Endpoint to get category structure
app.get('/api/category-structure', (req, res) => {
    res.json(categoryStructure);
});

// Modified question generation endpoint with better error handling
app.get('/api/generate-questions', async (req, res) => {
    try {
        const {
            mainCategory,
            subCategory,
            topic,
            ageGroup = 'teen',
            language = 'English',
            numQuestions = 10 // Add default value
        } = req.query;

        // Use req.groq instead of global groq
        const questions = await generateQuizQuestions(
            mainCategory,
            subCategory,
            topic,
            ageGroup,
            language,
            req.groq,
            numQuestions // Pass numQuestions parameter
        );

        res.json({
            success: true,
            questions: questions
        });
    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate questions',
            fallbackQuestions: getFallbackQuestions(req.query.language || 'English')
        });
    }
});



// Add a retry endpoint
app.get('/api/retry-questions', async (req, res, next) => {
    try {
        // Clear any rate limit cache for this request
        delete req.rateLimit;
        
        // Forward to generate questions endpoint
        return await generateQuizQuestions(req, res, next);
    } catch (error) {
        next(error);
    }
});

// Add health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Use the error handler
app.use(errorHandler);

// Modify the server start for Vercel
if (process.env.VERCEL) {
    // Export the Express app for Vercel
    export default app;
} else {
    // Start the server locally
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
} 