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

- **Name:** Marie Haug Laukeland and Helene Bech Andersen
- **Student number:** n12541184 and n12542407
- **Partner name (if applicable):** YourPartner NameHere
- **Application name:** Editly
- **Two line description:** We have implemented: 
- **EC2 instance name or ID:** n12542407-photo-app

------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  S3
- **What data is being stored?:** Picture-files
- **Why is this service suited to this data?:** Large files are best suited to blob storage due to size restrictions 
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**n12542407-photo-app
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Second data persistence service

- **AWS service name:**  MongoDB
- **What data is being stored?:** Metadata for pictures and comments
- **Why is this service suited to this data?:**
- **Why is are the other services used not suitable for this data?:**
- **Bucket/instance/table name:**
- **Video timestamp:**
- **Relevant files:**
    -

### S3 Pre-signed URLs

- **S3 Bucket names:** n12542407-photo-app
- **Video timestamp:**
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

- **User pool name:**
- **How are authentication tokens handled by the client?:** [eg. Response to login request sets a cookie containing the token.]
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito multi-factor authentication

- **What factors are used for authentication:** [eg. password, SMS code]
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito federated identities

- **Identity providers used:**
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito groups

- **How are groups used to set permissions?:** Admin can delete pictures and have access to all pictures. 
- **Video timestamp:**
- **Relevant files:**
    -

### Core - DNS with Route53

- **Subdomain**:  editly.cab432.com
- **Video timestamp:**

### Parameter store

- **Parameter names:** [eg. n1234567/base_url]
- **Video timestamp:**
- **Relevant files:**
    -

### Secrets manager

- **Secrets names:** [eg. n1234567-youtube-api-key]
- **Video timestamp:**
- **Relevant files:**
    -

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
    -



