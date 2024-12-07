let categoryStructure = {};
let currentQuestion = 0;
let score = 0;
let questions = [];
let userAnswers = [];
let groqApiKey = localStorage.getItem('groqApiKey');

// Initialize or reset the quiz
function initQuiz() {
    currentQuestion = 0;
    score = 0;
    questions = [];
    userAnswers = [];

    // Reset UI elements
    $('#quiz-section').addClass('hidden');
    $('.category-selection').removeClass('hidden');
    $('#score-container').addClass('hidden').empty();
    $('#question-container').removeClass('slide-in slide-out');
    $('#options-container').empty();
    $('#progress').text('Question 1/10');
    
    // Clear any existing warnings/errors
    $('.warning-message, .error-container, .retry-countdown').remove();
    
    // Reset buttons
    $('#prev-btn').addClass('hidden');
    $('#next-btn').removeClass('hidden').text('Next');
    $('#start-quiz').prop('disabled', false).text('Start Quiz');
}

// Handle start quiz button
$('#start-quiz').on('click', async function() {
    if (!groqApiKey) {
        alert('Please set up your GROQ API key first');
        $('#api-setup-popup').removeClass('hidden');
        return;
    }

    const mainCategory = $('#main-category-selector').val();
    const subCategory = $('#sub-category-selector').val();
    const topic = $('#topic-selector').val();
    const ageGroup = $('#age-selector').val();
    const languageCode = $('#language-selector').val();

    if (!mainCategory || !subCategory || !topic) {
        alert('Please select all categories before starting the quiz');
        return;
    }

    try {
        $(this).prop('disabled', true).text('Loading Questions...');
        
        const response = await fetch('/api/generate-questions?' + new URLSearchParams({
            mainCategory,
            subCategory,
            topic,
            ageGroup,
            language: languageCode
        }), {
            headers: {
                'X-GROQ-API-KEY': groqApiKey
            }
        });

        const data = await response.json();
        
        if (data.success && data.questions && data.questions.length > 0) {
            questions = data.questions;
            $('.category-selection').addClass('hidden');
            $('#quiz-section').removeClass('hidden');
            currentQuestion = 0;
            loadQuestion();
        } else {
            throw new Error(data.error || 'Failed to load questions');
        }
    } catch (error) {
        console.error('Error:', error);
        showError();
    } finally {
        $(this).prop('disabled', false).text('Start Quiz');
    }
});

// Modified loadQuestion function with better error handling
function loadQuestion() {
    console.log('Loading question:', currentQuestion, 'Total questions:', questions.length);
    
    if (!questions || !questions[currentQuestion]) {
        console.error('Invalid question data:', questions);
        showError();
        return;
    }

    const question = questions[currentQuestion];
    $('#question').text(question.question);
    $('#options-container').empty();

    question.options.forEach((option, index) => {
        const button = $(`
            <button class="option option-hover w-full p-4 mb-2 text-left rounded-lg">
                ${option}
            </button>
        `);
        
        button.on('click', function() {
            if (userAnswers[currentQuestion] === undefined) {
                userAnswers[currentQuestion] = index;
                $('.option').prop('disabled', true);
                
                // Show immediate feedback
                if (index === question.correct) {
                    $(this).addClass('bg-green-500/20');
                    score++;
                    showAnswerFeedback(true, question.explanation);
                } else {
                    $(this).addClass('bg-red-500/20');
                    $('.option').eq(question.correct).addClass('bg-green-500/20');
                    showAnswerFeedback(false, question.explanation);
                }
                
                $('#next-btn').removeClass('hidden');
                updateNavigation();
            }
        });
        
        $('#options-container').append(button);
    });

    // Update progress and navigation
    $('#progress').text(`Question ${currentQuestion + 1}/${questions.length}`);
    updateNavigation();
}

// Update navigation buttons
function updateNavigation() {
    $('#prev-btn').toggleClass('hidden', currentQuestion === 0);
    
    const isLastQuestion = currentQuestion === questions.length - 1;
    const $nextBtn = $('#next-btn');
    
    $nextBtn
        .text(isLastQuestion ? 'Finish Quiz' : 'Next')
        .toggleClass('hidden', userAnswers[currentQuestion] === undefined);

    // Handle next button click
    $nextBtn.off('click').on('click', function() {
        if (userAnswers[currentQuestion] !== undefined) {
            if (isLastQuestion) {
                showScore();
            } else {
                currentQuestion++;
                loadQuestion();
            }
        }
    });

    // Handle previous button click
    $('#prev-btn').off('click').on('click', function() {
        if (currentQuestion > 0) {
            currentQuestion--;
            loadQuestion();
        }
    });
}

// Handle rate limiting
function handleRateLimit(retryAfter) {
    const countdownDiv = $(`
        <div class="retry-countdown text-center p-4 bg-gray-100 rounded-lg">
            <span class="countdown-text"></span>
        </div>
    `).appendTo('#quiz-section');

    const updateCountdown = () => {
        const secondsLeft = Math.ceil((retryAfter - Date.now()) / 1000);
        if (secondsLeft <= 0) {
            countdownDiv.remove();
            showRetryOptions();
        } else {
            countdownDiv.find('.countdown-text').text(`Try again in ${secondsLeft} seconds`);
            setTimeout(updateCountdown, 1000);
        }
    };
    updateCountdown();
}

// Modified showError function with more detailed feedback
function showError() {
    $('#quiz-section').html(`
        <div class="error-container p-6 glass-effect">
            <div class="text-red-500 mb-4">
                <p class="font-bold">Error Loading Questions</p>
                <p class="text-sm mt-2">Please check your selections and try again.</p>
            </div>
            <div class="flex gap-4">
                <button class="retry-quiz cyber-button">Try Again</button>
                <button class="new-category cyber-button">Choose New Category</button>
            </div>
        </div>
    `);
}

// Event handlers
$(document).on('click', '.retry-quiz', function() {
    initQuiz();
    $('#start-quiz').click();
});

$(document).on('click', '.new-category', function() {
    initQuiz();
});

$(document).on('click', '#restart-btn', function() {
    initQuiz();
});

// Add this function to fetch and populate category structure
async function fetchCategoryStructure() {
    if (!checkApiKeyStatus()) return;

    try {
        const response = await fetch('/api/category-structure', {
            headers: addApiKeyHeader()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch category structure');
        }

        categoryStructure = await response.json();
        
        // Populate main category selector
        const mainSelector = $('#main-category-selector');
        mainSelector.empty();
        mainSelector.append('<option value="">Select Category</option>');
        
        Object.keys(categoryStructure).forEach(category => {
            mainSelector.append(`<option value="${category}">${category}</option>`);
        });

        // Add event listeners for category changes
        setupCategoryListeners();
    } catch (error) {
        console.error('Error fetching categories:', error);
        showError();
    }

    // Add small BuyMeACoffee button after category selectors
    const coffeeButton = `
        <div class="mt-4 text-center">
            <a href="https://www.buymeacoffee.com/arlinamid" target="_blank" 
               class="inline-flex items-center px-4 py-2 text-sm cyber-button">
                <span>☕ Support this project</span>
            </a>
        </div>
    `;
    $('.category-selection').append(coffeeButton);
}

// Add event listeners for category selection
function setupCategoryListeners() {
    // Main category change handler
    $('#main-category-selector').on('change', function() {
        const mainCategory = $(this).val();
        const subSelector = $('#sub-category-selector');
        const topicSelector = $('#topic-selector');
        
        // Reset sub-categories
        subSelector.empty().append('<option value="">Select Sub-Category</option>');
        topicSelector.empty().append('<option value="">Select Topic</option>');
        
        if (mainCategory && categoryStructure[mainCategory]) {
            // Populate sub-categories
            Object.keys(categoryStructure[mainCategory].subCategories).forEach(subCategory => {
                subSelector.append(`<option value="${subCategory}">${subCategory}</option>`);
            });
            
            // Update age groups if available
            updateAgeGroups(mainCategory);
        }
    });

    // Sub-category change handler
    $('#sub-category-selector').on('change', function() {
        const mainCategory = $('#main-category-selector').val();
        const subCategory = $(this).val();
        const topicSelector = $('#topic-selector');
        
        // Reset topics
        topicSelector.empty().append('<option value="">Select Topic</option>');
        
        if (mainCategory && subCategory && categoryStructure[mainCategory].subCategories[subCategory]) {
            // Populate topics
            categoryStructure[mainCategory].subCategories[subCategory].forEach(topic => {
                topicSelector.append(`<option value="${topic}">${topic}</option>`);
            });
        }
    });
}

// Update age groups based on main category
function updateAgeGroups(mainCategory) {
    const ageSelector = $('#age-selector');
    ageSelector.empty().append('<option value="">Select Age Group</option>');
    
    if (categoryStructure[mainCategory] && categoryStructure[mainCategory].ageGroups) {
        categoryStructure[mainCategory].ageGroups.forEach(age => {
            ageSelector.append(`<option value="${age}">${age.charAt(0).toUpperCase() + age.slice(1)}</option>`);
        });
    }
}

// Make sure to call fetchCategoryStructure when document is ready
$(document).ready(function() {
    fetchCategoryStructure();
    initQuiz();
});

function showScore() {
    const summaryHtml = generateQuizSummary();
    $('#quiz-section').addClass('hidden');
    $('#score-container').removeClass('hidden').html(summaryHtml);
}

function generateQuizSummary() {
    const totalQuestions = questions.length;
    const percentageScore = (score / totalQuestions) * 100;
    
    let summaryHtml = `
        <div class="glass-effect p-8">
            <div class="text-center mb-8">
                <h2 class="text-4xl font-bold neon-text mb-4">Quiz Complete!</h2>
                <div class="score-display text-3xl mb-4">
                    Score: ${score}/${totalQuestions} (${percentageScore.toFixed(1)}%)
                </div>
                <p class="text-xl mb-6">${getPerformanceAnalysis(percentageScore)}</p>
                
                <!-- Add BuyMeACoffee prominent button -->
                <div class="my-8">
                    <a href="https://www.buymeacoffee.com/arlinamid" 
                       target="_blank" 
                       class="inline-flex items-center px-6 py-3 text-lg cyber-button hover:scale-105 transition-transform">
                        <span class="mr-2">☕</span>
                        <span>Buy me a coffee if you enjoyed this quiz!</span>
                    </a>
                </div>
            </div>
            
            <div class="space-y-6 mb-8">
                <h3 class="text-2xl font-semibold mb-4 neon-text">Question Breakdown:</h3>
                ${generateQuestionBreakdown()}
            </div>

            <div class="mt-8 flex justify-center gap-4">
                <button id="restart-btn" class="cyber-button">Try Another Quiz</button>
                <button id="share-btn" class="cyber-button">Share Results</button>
            </div>
        </div>
    `;

    return summaryHtml;
}

function generateQuestionBreakdown() {
    return questions.map((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct;
        const borderColor = isCorrect ? 'border-green-500' : 'border-red-500';
        const bgColor = isCorrect ? 'bg-green-500/20' : 'bg-red-500/20';
        
        return `
            <div class="glass-effect p-4 ${borderColor} ${bgColor} mb-4">
                <p class="font-medium mb-2">Question ${index + 1}: ${question.question}</p>
                <p class="mb-1">Your Answer: ${question.options[userAnswer]}</p>
                ${!isCorrect ? `<p class="mb-1 text-green-400">Correct Answer: ${question.options[question.correct]}</p>` : ''}
                <p class="text-sm mt-2 text-gray-300">${question.explanation || 'No explanation available.'}</p>
            </div>
        `;
    }).join('');
}

function getPerformanceAnalysis(percentageScore) {
    if (percentageScore === 100) {
        return "Perfect score! You've demonstrated complete mastery of this topic.";
    } else if (percentageScore >= 80) {
        return "Excellent performance! You have a strong understanding of the subject matter.";
    } else if (percentageScore >= 60) {
        return "Good effort! You've shown decent knowledge but there's room for improvement.";
    } else if (percentageScore >= 40) {
        return "You've grasped some concepts, but reviewing the material would be beneficial.";
    } else {
        return "This topic might need more study. Consider reviewing the material and trying again.";
    }
}

function showAnswerFeedback(isCorrect, explanation) {
    const feedbackHtml = `
        <div class="mt-4 p-4 glass-effect ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}">
            <p class="font-semibold mb-2">
                ${isCorrect ? 'Correct!' : 'Incorrect'}
            </p>
            <p class="text-sm">${explanation || 'No explanation available.'}</p>
        </div>
    `;
    
    // Remove any existing feedback before adding new
    $('.answer-feedback').remove();
    $('#options-container').append(feedbackHtml);
}

// Add event listeners for the new buttons
$(document).on('click', '#share-btn', function() {
    const text = `I scored ${score}/${questions.length} on the quiz!`;
    if (navigator.share) {
        navigator.share({
            title: 'Quiz Results',
            text: text,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback for browsers that don't support Web Share API
        prompt('Copy this text to share your results:', text);
    }
});

$(document).on('click', '#restart-btn', function() {
    initQuiz();
});

// Add API endpoints
const DUCKDUCKGO_API = 'https://api.duckduckgo.com/';
const MEDIAWIKI_API = 'https://en.wikipedia.org/w/api.php';

async function validateAnswer(question, selectedAnswer, correctAnswer) {
    try {
        // Check both DuckDuckGo and Wikipedia
        const [ddgResult, wikiResult] = await Promise.all([
            checkDuckDuckGo(question, selectedAnswer),
            checkWikipedia(question, selectedAnswer)
        ]);

        const isCorrect = selectedAnswer === correctAnswer;
        const confidence = Math.max(ddgResult.confidence || 0, wikiResult.confidence || 0);
        
        return {
            isCorrect,
            confidence,
            explanation: isCorrect ? 
                        (ddgResult.explanation || wikiResult.explanation || "Correct!") :
                        `The correct answer is: ${correctAnswer}`
        };
    } catch (error) {
        console.error('Validation error:', error);
        return {
            isCorrect: selectedAnswer === correctAnswer,
            confidence: 1,
            explanation: `The correct answer is: ${correctAnswer}`
        };
    }
}

async function checkDuckDuckGo(question, answer) {
    try {
        const query = encodeURIComponent(`${question} ${answer}`);
        const response = await fetch(`${DUCKDUCKGO_API}?q=${query}&format=json&no_html=1&skip_disambig=1`);
        const data = await response.json();
        
        const confidence = calculateConfidence(data.AbstractText, answer);
        return {
            confidence,
            explanation: data.AbstractText
        };
    } catch (error) {
        console.error('DuckDuckGo API error:', error);
        return { confidence: 0 };
    }
}

async function checkWikipedia(question, answer) {
    try {
        const params = new URLSearchParams({
            action: 'query',
            format: 'json',
            list: 'search',
            srsearch: `${question} ${answer}`,
            utf8: 1,
            origin: '*'
        });

        const response = await fetch(`${MEDIAWIKI_API}?${params}`);
        const data = await response.json();
        
        if (data.query && data.query.search.length > 0) {
            const topResult = data.query.search[0];
            const confidence = calculateConfidence(topResult.snippet, answer);
            return {
                confidence,
                explanation: stripHtml(topResult.snippet)
            };
        }
        return { confidence: 0 };
    } catch (error) {
        console.error('Wikipedia API error:', error);
        return { confidence: 0 };
    }
}

function calculateConfidence(text, answer) {
    if (!text || !answer) return 0;
    
    const textWords = text.toLowerCase().split(/\W+/);
    const answerWords = answer.toLowerCase().split(/\W+/);
    
    let matchCount = 0;
    for (const word of answerWords) {
        if (textWords.includes(word)) matchCount++;
    }
    
    return matchCount / answerWords.length;
}

function stripHtml(html) {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Update the option click handler
function handleOptionClick(optionIndex) {
    if (userAnswers[currentQuestion] !== undefined) return;
    
    const currentQ = questions[currentQuestion];
    userAnswers[currentQuestion] = optionIndex;
    
    validateAnswer(
        currentQ.question,
        currentQ.options[optionIndex],
        currentQ.options[currentQ.correct]
    ).then(result => {
        if (result.isCorrect) {
            score++;
        }
        
        // Show feedback
        showAnswerFeedback(result.isCorrect, result.explanation);
        
        // Update UI
        updateOptionStyles(optionIndex, currentQ.correct);
        updateNavigation();
    });
}

function updateOptionStyles(selectedIndex, correctIndex) {
    const options = $('#options-container .option');
    
    options.each((index, option) => {
        $(option).removeClass('option-hover').addClass('disabled');
        
        if (index === correctIndex) {
            $(option).addClass('bg-green-500/20 border-green-500');
        } else if (index === selectedIndex && selectedIndex !== correctIndex) {
            $(option).addClass('bg-red-500/20 border-red-500');
        }
    });
}

// Add API key setup function
function setupGroqApiKey() {
    const setupHtml = `
        <div id="api-setup-popup" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
            <div class="glass-effect p-6 rounded-lg max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold neon-text">GROQ API Setup</h3>
                    <button id="close-setup" class="text-gray-400 hover:text-white">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                <div class="mb-6 text-gray-300 text-sm">
                    <h4 class="font-semibold mb-2">How to get your GROQ API Key:</h4>
                    <ol class="list-decimal list-inside space-y-2">
                        <li>Visit <a href="https://console.groq.com/keys" target="_blank" class="text-blue-400 hover:text-blue-300 underline">GROQ Console</a></li>
                        <li>Sign up or log in to your account</li>
                        <li>Go to API Keys section</li>
                        <li>Click "Create New Key"</li>
                        <li>Copy your API key</li>
                    </ol>
                    <p class="mt-3 text-yellow-300">Note: Keep your API key secure and never share it publicly.</p>
                </div>

                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-300 mb-2">GROQ API Key</label>
                    <input type="password" id="groq-api-key" 
                           class="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                           placeholder="Enter your GROQ API key">
                </div>
                <div class="flex justify-end gap-4">
                    <button id="test-api" class="cyber-button">Test Connection</button>
                    <button id="save-api" class="cyber-button">Save Key</button>
                </div>
            </div>
        </div>
    `;

    // Add setup button to the page
    const setupButton = `
        <button id="setup-api" class="fixed top-4 right-4 cyber-button p-2" title="API Setup">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
    `;

    $('body').append(setupHtml);
    $('body').append(setupButton);

    // Event handlers
    $('#setup-api').on('click', () => {
        $('#api-setup-popup').removeClass('hidden');
        $('#groq-api-key').val(groqApiKey || '');
    });

    $('#close-setup').on('click', () => {
        $('#api-setup-popup').addClass('hidden');
    });

    $('#test-api').on('click', async () => {
        const key = $('#groq-api-key').val();
        if (!key) {
            alert('Please enter an API key');
            return;
        }

        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-GROQ-API-KEY': key
                },
                body: JSON.stringify({ apiKey: key })
            });
            
            const data = await response.json();
            if (data.success) {
                alert('Connection successful!');
            } else {
                alert('Connection failed: ' + data.error);
            }
        } catch (error) {
            alert('Connection test failed: ' + error.message);
        }
    });

    $('#save-api').on('click', () => {
        const key = $('#groq-api-key').val();
        if (key) {
            groqApiKey = key;
            localStorage.setItem('groqApiKey', key);
            $('#api-setup-popup').addClass('hidden');
            alert('API key saved successfully!');
            location.reload();
        } else {
            alert('Please enter an API key');
        }
    });
}

// Call setup function when document is ready
$(document).ready(() => {
    setupGroqApiKey();
    if (!groqApiKey) {
        $('#api-setup-popup').removeClass('hidden');
    }
});

// Add this function to check API key status
function checkApiKeyStatus() {
    if (!groqApiKey) {
        $('#api-setup-popup').removeClass('hidden');
        return false;
    }
    return true;
}

// Ensure the API key is added to headers
function addApiKeyHeader(headers = {}) {
    return {
        ...headers,
        'X-GROQ-API-KEY': groqApiKey
    };
}
  