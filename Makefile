PORT=80

run-local:
	npm install
	npm run dev

run-dev: clean
	#docker build -t better_reads-web --target dev .
	#docker run --rm --name better_reads-web -p ${PORT}:3000 better_reads-web:latest
	docker compose up --build 

run-prod:
	docker build -t better_reads-web --target prod .
	docker run --rm --name better_reads-web -p ${PORT}:80 better_reads-web:latest

clean:
	- docker compose down --remove-orphans
	- docker container kill better_reads-web
	- docker image rm -f better_reads-web
	

