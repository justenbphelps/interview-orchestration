# LangGraph Server Dockerfile
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source
COPY src/ ./src/
COPY tsconfig.json langgraph.json ./

# Build TypeScript
RUN yarn build

# Expose the LangGraph server port
EXPOSE 2024

# Start LangGraph server
CMD ["npx", "@langchain/langgraph-cli", "up", "--host", "0.0.0.0", "--port", "2024"]
