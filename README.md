# AI-Powered Quiz Application

A modern, responsive quiz application powered by GROQ AI, featuring dynamic question generation, multiple languages, and a futuristic 3D design using Tailwind CSS.

## 🌟 Features

- **AI-Driven Questions**: Dynamic question generation using GROQ AI
- **Multiple Categories**: Various subjects including Science, Technology, History, and more
- **Age-Appropriate Content**: Content tailored for different age groups
- **Multi-Language Support**: Support for 11 languages including English, French, Spanish, and more
- **Responsive Design**: Fully responsive with modern 3D elements
- **Real-Time Validation**: Immediate feedback on answers
- **Progress Tracking**: Track quiz progress and scores
- **Interactive UI**: Modern glass-morphism and cyber-punk inspired design

## 🚀 Quick Start

1. Clone the repository:

bash
git clone <repository-url>
cd quiz-app

2. Add the required CDN links to your HTML:

```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
```

3. Set up your GROQ API key:
   - Visit [GROQ Console](https://console.groq.com/keys)
   - Create a new API key
   - Add it to the application when prompted

4. Start the server:

```bash
npm install
npm start
```

## 🎨 Design Features

- **Glass Morphism**: Modern transparent elements with blur effects
- **3D Elements**: Depth and perspective animations
- **Neon Effects**: Cyberpunk-inspired glowing elements
- **Responsive Grid**: Fluid layouts that work on all devices
- **Interactive Elements**: Hover and click animations

## 🛠️ Technical Stack

- **Frontend**:
  - Tailwind CSS for styling
  - jQuery for DOM manipulation
  - Custom 3D CSS animations
  - Responsive design principles

- **Backend**:
  - Node.js with Express
  - GROQ AI integration
  - Multi-language support
  - Rate limiting and error handling

## 📱 Responsive Breakpoints

```css
/* Mobile First Design */
sm: '640px'   /* Small devices */
md: '768px'   /* Medium devices */
lg: '1024px'  /* Large devices */
xl: '1280px'  /* Extra large devices */
2xl: '1536px' /* 2X Extra large devices */
```

## 🌍 Supported Languages

- English (en)
- French (fr)
- Spanish (es)
- German (de)
- Italian (it)
- Japanese (ja)
- Korean (ko)
- Portuguese (pt)
- Russian (ru)
- Chinese (zh)
- Hungarian (hu)

## 🎯 Quiz Categories

- Science
- Technology
- Mathematics
- History & Culture
- Nature & Environment
- Arts & Creativity
- Language & Literature
- Social Studies
- Health & Wellness
- Life Skills
- Critical Thinking

## 🔒 Security Features

- API key validation
- Rate limiting
- Error handling
- Input sanitization
- Secure data transmission

## 🚧 Error Handling

The application includes comprehensive error handling:
- API connection failures
- Rate limiting
- Invalid responses
- Network issues
- Fallback questions

## 🎮 Usage Example

```javascript
// Initialize quiz
$('#start-quiz').on('click', async function() {
    if (!groqApiKey) {
        alert('Please set up your GROQ API key first');
        $('#api-setup-popup').removeClass('hidden');
        return;
    }
    // Quiz initialization logic...
});
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE.md file for details

## 🙏 Acknowledgments

- GROQ AI for providing the question generation API
- Tailwind CSS for the styling framework
- jQuery community for the robust library
- All contributors and testers

## 📞 Support

For support, please open an issue in the repository or contact the maintainers.

---

Made with ❤️ by [Janos Rozsavolgyi](https://github.com/arlinamid)