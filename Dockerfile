FROM node:20 AS base

WORKDIR /app

COPY package*.json ./
RUN npm install 

#COPY ./views ./views
#COPY ./static ./static

RUN mkdir ./database_files
COPY ./database_files/books_data.csv ./database_files/
COPY ./database_files/books_rating.csv ./database_files/

EXPOSE 80

# testing
FROM base AS test
# install or run testing framework

# development 
FROM base AS dev
RUN npm install -g nodemon

CMD ["npm", "run", "dev"]

# production 
FROM base AS prod
COPY ./public /app/public
COPY ./src /app/src

CMD ["npm", "run", "prod"]

