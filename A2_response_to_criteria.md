Assignment 2 - Cloud Services Exercises - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Marie Haug Laukeland 
- **Student number:** n12541184 
- **Partner name (if applicable):** Helene Bech Andersen (n12542407)
- **Application name:** Editly
- **Two line description:** We have implemented: A photo-application where you can upload, comment and edit photos. In this assignment we have implementes cloud-based storage of picture-file and metadata for comments and pictures, using AWS S3-buckets and MongoDB. We have improved the login with two-factor-authentication and different user groups, using AWS Cognito. 
- **EC2 instance name or ID:** n12542407-photo-app

------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  S3
- **What data is being stored?:** Picture-files
- **Why is this service suited to this data?:** S3 allows users to save different versions of pictures (original/medium/edit). You store them with a unique key and that makes it easy to access and manage. 
- **Why is are the other services used not suitable for this data?:** Its dynamic and you don´t have to worry if you run out of space, and its client focused because you can send them a link they can easily access on their own device.
- **Bucket/instance/table name:** n12542407-photo-app
- **Video timestamp:** 00:17
- **Relevant files:**
    -config/s3.js
    -routes/images.js
    -routes/s3.js
    -server.js

### Core - Second data persistence service

- **AWS service name:**  MongoDB
- **What data is being stored?:** Metadata for pictures and comments
- **Why is this service suited to this data?:** Its a visual and easy way to store data for programmers. 
- **Why is are the other services used not suitable for this data?:** NoSQL is better if you want scalability, flexibility and performance for specific workloads. 
- **Bucket/instance/table name:** Project0 on MongoDB
- **Video timestamp:** 0:55
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:** n12542407-photo-app
- **Video timestamp:** 2:00
- **Relevant files:**
    -config/s3.js
    -routes/images.js

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** [eg. intermediate video files that have been transcoded but not stabilised]
- **Why is this data not considered persistent state?:** [eg. intermediate files can be recreated from source if they are lost]
- **How does your application ensure data consistency if the app suddenly stops?:** [eg. journal used to record data transactions before they are done.  A separate task scans the journal and corrects problems on startup and once every 5 minutes afterwards. ]
- **Relevant files:**
    -

### Core - Authentication with Cognito

- **User pool name:** User pool - wo7klr
- **How are authentication tokens handled by the client?:** Response to login request sets a cookie in the session containing the token. 
- **Video timestamp:** 2:34
- **Relevant files:**
    -server.js
    -app.js

### Cognito multi-factor authentication

- **What factors are used for authentication:** Password and email code. 
- **Video timestamp:** 2:45 
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** 'Admin' can delete images and see all images uploaded by all users. 'User' can only see their own images, and cannot delete them. 
- **Video timestamp:** 3:05
- **Relevant files:**
    -app.js
    -server.js
    -images.js

### Core - DNS with Route53

- **Subdomain**:  editly.cab432.com
- **Video timestamp:** 5:35




