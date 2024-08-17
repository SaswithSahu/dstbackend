# Use the official Node.js 20 image
FROM node:20

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the backend source code
COPY . .

# Expose port 5000
EXPOSE 5000

# Command to run your Node.js server
CMD ["node", "app.js"]