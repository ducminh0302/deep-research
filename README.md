# Deep Research Chat App 🚀

A powerful, agentic chat application powered. This app goes beyond simple Q&A by performing iterative, deep research on complex topics, synthesizing information from multiple sources, and presenting it in a split-screen layout with a detailed report.

## ✨ Key Features

*   **🕵️ Agentic Research Loop**: The AI autonomously decides when to search, what to search for, and when to synthesize findings, ensuring comprehensive answers.
*   **🖥️ Split-Screen UI**: View the chat/planning process on the left and the detailed, formatted report on the right.
*   **🔗 Smart Source Tracking**: Transparently cites sources with accurate domain names and links.
*   **🧠 "Thinking" Process**: Visibility into the AI's reasoning steps (Activity Log).
*   **� Multi-modal Support**: Analyze images and PDFs (if configured).
*   **⚡ Modern Tech Stack**: Built with React, Vite, TypeScript, and Tailwind CSS.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **AI Model**: Google Gemini 2.5 Flash (via `@google/genai`)
*   **Icons**: FontAwesome

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v18 or higher)
*   **Google Gemini API Key**: Get one for free at [Google AI Studio](https://aistudio.google.com/).

### 💻 Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ducminh0302/deep-research.git
    cd deep-search
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**:
    Create a `.env.local` file in the root directory:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` in your browser.

### 🐳 Running with Docker

You can easily containerize and run the application using Docker.

1.  **Build and Run**:
    ```bash
    # Inline API Key
    API_KEY=your_api_key docker-compose up --build

    # OR using a .env file
    docker-compose up --build -d
    ```

2.  **Access**:
    Navigate to `http://localhost:3000`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
