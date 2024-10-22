PORT=80


help:            ## Show this help.
	@sed -ne '/@sed/!s/## //p' $(MAKEFILE_LIST)

run-local:       ## Run the system locally.
	npm install
	npm run dev

run-dev: clean   ## Run with real-time src code update
	#docker build -t better_reads-web --target dev .
	#docker run --rm --name better_reads-web -p ${PORT}:3000 better_reads-web:latest
	docker compose up --build 

run-prod:        ## Run with production dependencies
	docker build -t better_reads-web --target prod .
	docker run --rm --name better_reads-web -p ${PORT}:80 better_reads-web:latest

clean:           ## Clean docker garbage (running `docker system prune --all` is recommended)
	- docker compose down --remove-orphans
	- docker container kill better_reads-web
	- docker image rm -f better_reads-web
	

