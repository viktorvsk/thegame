FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Expose port 3000 for the Express app
EXPOSE 3000

# Start the Express server
CMD ["node", "app.js"]
