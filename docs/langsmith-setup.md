# LangSmith Tracing Setup

LangSmith provides detailed tracing for LangGraph applications, allowing you to:
- See every node execution in the graph
- Track LLM calls with inputs/outputs
- Measure latency and costs
- Debug issues in production

## Setup Instructions

### 1. Get Your API Key

1. Go to [LangSmith](https://smith.langchain.com)
2. Sign up or log in
3. Click "Settings" → "API Keys"
4. Click "Generate API Key"
5. Copy the key

### 2. Configure Environment Variables

Add these to your `.env` file in the project root:

```bash
# Enable tracing
LANGSMITH_TRACING=true

# LangSmith API endpoint
LANGSMITH_ENDPOINT=https://api.smith.langchain.com

# Your LangSmith API key
LANGSMITH_API_KEY=lsv2_your-api-key-here

# Project name (will be created if doesn't exist)
LANGSMITH_PROJECT=interview-orchestration
```

### 3. Restart the LangGraph Server

```bash
npx @langchain/langgraph-cli dev
```

### 4. View Traces

1. Go to [LangSmith](https://smith.langchain.com)
2. Select your project "interview-orchestration"
3. You'll see all graph executions with:
   - Full execution timeline
   - Node-by-node breakdown
   - LLM call details (prompts, responses, tokens, latency)
   - Error traces

## What Gets Traced

With LangSmith enabled, you'll see:

| Component | What's Traced |
|-----------|---------------|
| **Graph Execution** | Start/end times, full state changes |
| **Nodes** | Each node execution with inputs/outputs |
| **LLM Calls** | Prompts, completions, token counts, latency |
| **Tools** | Tool calls with arguments and results |
| **Agents** | Multi-agent coordination |
| **Errors** | Full stack traces and context |

## Trace Hierarchy

```
Interview Run
├── initialize
│   └── LLM Call (welcome message)
├── askQuestion
├── translateIfNeeded
│   └── LLM Call (translation check)
├── validateFormat
├── analyzeResponse
│   ├── LLM Call (check concerns)
│   └── LLM Call (check proper response)
├── generateEmpathy
│   └── LLM Call (empathy generation)
├── storeAssessmentResponse
└── complete
    └── LLM Call (closing message)
```

## Tips

- **Filtering**: Use the LangSmith UI to filter by tags, time range, or status
- **Feedback**: Add feedback to traces to track quality over time
- **Datasets**: Export traces to create test datasets
- **Monitoring**: Set up alerts for errors or latency spikes

