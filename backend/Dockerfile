FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install

RUN printf '#!/bin/sh\nset -e\n\nhost="$1"\nshift\n\nuntil pg_isready -h "$host" -p 5432; do\n  echo "Waiting for postgres..."\n  sleep 2\ndone\n\nexec "$@"\n' > /usr/local/bin/wait-for.sh && chmod +x /usr/local/bin/wait-for.sh

COPY . .

RUN npx nodemon --version || npm install -g nodemon

EXPOSE 5000

CMD ["sh", "-c", "/usr/local/bin/wait-for.sh postgres npm run migrate:up && npm run dev"]