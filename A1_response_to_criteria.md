Assignment 1 - REST API Project - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Helene Bech Andersen
- **Student number:** n12542407
- **Application name:** Editly
- **Two line description:** This is a Photo-editing application, where you can upload, comment, edit and delete (admin only) pictures.  


Core criteria
------------------------------------------------

### Containerise the app

Your application has been bundled into a Docker container and stored on our AWS ECR instance.

- **ECR Repository name:**
- **Video timestamp:**
- **Relevant files:**
    - 

### Deploy the container

Your application container has been pulled from AWS ECR and deployed to an EC2 instance.

- **EC2 instance ID:**
- **Video timestamp:**

### User login

Your application has basic user login and session management with JWT. Logins must have meaningful distinctions for different users.

- **One line description:** Hard-coded username/password list. Using JWTs for sessions. Admin can see all pictures users have uploaded and also has the option to delete pictures.
- **Video timestamp:**
- **Relevant files:**
    - /config/users.json
    - /routes/auth.js

### REST API

Your application has a REST-based application programming interface (API) which is considered its primary interface. 

- **One line description:** REST api with endpoints and http methonds (POST, GET, DELETE)
- **Video timestamp:**
- **Relevant files:**
    - /routes/comments.js
    - /routes/images.js
    - /routes/auth.js

### Two data types

- **One line description:** The application stores pictures (original, edited etc.) and comments related to specific pictures. 
- **Video timestamp:**
- **Relevant files:**
    - /uploads/originals/
    - /uploads/derived/ 
    - /models/Image.js
    - /models/Comment.js
    - /routes/images.js
    - /routes/comments.js

#### First kind

- **One line description:** Pictures (original and edited)
- **Type:** Unstructured 
- **Rationale:** The picture files (JPEG, PNG, WebP) are saved and stored on disk because they are to big to store in the database. 
- **Video timestamp:**
- **Relevant files:**
    - /uploads/originals/ (original image)
    - /uploads/derived/ (edited image)
    - /routes/images.js (upload, process and edit)


#### Second kind

- **One line description:** Metadata of pictures and comments
- **Type:** Structured (MongoDB)
- **Rationale:** Easy to search, filter and fetch specific data by id.
- **Video timestamp:**
- **Relevant files:**
    - /models/Image.js
    - /models/Comment.js
    - /routes/images.js
    - /routes/comments.js

### CPU intensive task

Your application uses at least one CPU intensive process that can be triggered by requests to load down the server. In later assessment, you will need to load down more servers so here, try to exceed 80% CPU usage for an extended time (5 minutes is enough).

 **One line description:** The CPU intensive process in this application is the "Greyscale" filter. 
- **Video timestamp:** 
- **Relevant files:**
    - 

### CPU load testing

You demonstrate a script or manual method for generating enough requests to load down the server to >80% CPU for an extended time (5 minutes is enough) with enough headroom on your network connection to load down an additional 3 servers.

 **One line description:**
- **Video timestamp:** 
- **Relevant files:**
    - 

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### External API(s)

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Additional types of data

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Custom processing

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Infrastructure as code

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

### Web client

- **One line description:** A simple web client that allows users to log in,upload images, view uploaded and edited images, add comments, and delete images (admin only)
- **Video timestamp:**
- **Relevant files:**
    - /public/app.html
    - /public/style.css
    - /public/app.js
    - /public/login.html
    - /public/login.js
    - /public/login.css
    - server.js

### Upon request

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 
