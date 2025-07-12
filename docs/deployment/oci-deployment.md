# Deploying Skill Swap Platform on Oracle Cloud Infrastructure (OCI) Free Tier

This guide provides instructions for deploying the Skill Swap Platform on Oracle Cloud Infrastructure (OCI) Free Tier. The deployment architecture uses the following OCI services:

- **Compute Instance**: For hosting the Node.js backend and React frontend
- **Autonomous Database**: For storing application data
- **Object Storage**: For storing user profile photos and other media

## Prerequisites

1. An Oracle Cloud account with Free Tier access
2. Git installed on your local machine
3. Node.js and npm installed on your local machine
4. Oracle Cloud CLI (optional, but recommended)

## Step 1: Set Up Oracle Autonomous Database

1. Sign in to your Oracle Cloud Console at [https://cloud.oracle.com](https://cloud.oracle.com)
2. Navigate to **Oracle Database** > **Autonomous Transaction Processing**
3. Click **Create Autonomous Database**
4. Fill in the following details:
   - **Compartment**: Select your compartment
   - **Display Name**: `skillswap-db`
   - **Database Name**: `skillswapdb`
   - **Workload Type**: Transaction Processing
   - **Deployment Type**: Shared Infrastructure
   - **Always Free**: Yes
   - **Admin Password**: Create a secure password (remember this!)
   - Leave other options as default
5. Click **Create Autonomous Database**
6. Wait for the database to be provisioned (this may take a few minutes)
7. Once provisioned, click on the database name to view details
8. Click **DB Connection** and download the Wallet (you'll need this for connecting to the database)

## Step 2: Set Up Object Storage

1. In the Oracle Cloud Console, navigate to **Storage** > **Buckets**
2. Click **Create Bucket**
3. Fill in the following details:
   - **Bucket Name**: `skillswap-media`
   - **Default Storage Tier**: Standard
   - **Encryption**: Encrypt using Oracle managed keys
4. Click **Create**
5. Click on the bucket name to view details
6. Under **Objects**, click **Upload** to test uploading a file
7. Note the bucket name and namespace for configuration

## Step 3: Create a Compute Instance

1. In the Oracle Cloud Console, navigate to **Compute** > **Instances**
2. Click **Create Instance**
3. Fill in the following details:
   - **Name**: `skillswap-server`
   - **Availability Domain**: Any available domain
   - **Image**: Oracle Linux 8
   - **Shape**: VM.Standard.E2.1.Micro (Always Free eligible)
   - **Virtual cloud network**: Create a new VCN or use an existing one
   - **Subnet**: Create a new subnet or use an existing one
   - **Assign a public IP address**: Yes
   - **SSH Keys**: Upload your public SSH key or generate a new key pair
4. Click **Create**
5. Wait for the instance to be provisioned (this may take a few minutes)
6. Note the public IP address of the instance

## Step 4: Configure Security Rules

1. Navigate to **Networking** > **Virtual Cloud Networks**
2. Click on your VCN
3. Click on the subnet used by your compute instance
4. Click on the Security List
5. Add the following Ingress Rules:
   - **Source CIDR**: 0.0.0.0/0
   - **IP Protocol**: TCP
   - **Destination Port Range**: 80, 443, 5000 (for HTTP, HTTPS, and Node.js server)

## Step 5: Set Up the Compute Instance

1. SSH into your compute instance:
   ```
   ssh opc@<your-instance-ip>
   ```

2. Update the system and install required packages:
   ```
   sudo dnf update -y
   sudo dnf install -y git nodejs npm nginx
   ```

3. Install Node.js 14 or higher:
   ```
   curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -
   sudo dnf install -y nodejs
   ```

4. Install Oracle Instant Client (required for oracledb):
   ```
   sudo dnf install -y oracle-instantclient-release-el8
   sudo dnf install -y oracle-instantclient-basic oracle-instantclient-devel
   ```

5. Configure environment variables:
   ```
   echo "export LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib" >> ~/.bashrc
   source ~/.bashrc
   ```

## Step 6: Deploy the Application

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/skillswap.git
   cd skillswap
   ```

2. Create the .env file in the backend directory:
   ```
   cd backend
   cp .env.example .env
   nano .env
   ```

3. Update the .env file with your Oracle Database connection details and other configuration:
   ```
   NODE_ENV=production
   PORT=5000

   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30

   ORACLE_USER=admin
   ORACLE_PASSWORD=your_db_password
   ORACLE_CONNECTION_STRING=your_connection_string

   ORACLE_BUCKET_NAME=skillswap-media
   ORACLE_NAMESPACE=your_namespace
   ORACLE_REGION=your_region
   ```

4. Install backend dependencies:
   ```
   npm install
   ```

5. Build the frontend:
   ```
   cd ../frontend
   npm install
   npm run build
   ```

6. Configure Nginx as a reverse proxy:
   ```
   sudo nano /etc/nginx/conf.d/skillswap.conf
   ```

7. Add the following configuration:
   ```
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or public IP

       location / {
           root /home/opc/skillswap/frontend/build;
           try_files $uri /index.html;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /uploads {
           alias /home/opc/skillswap/backend/uploads;
       }
   }
   ```

8. Test and restart Nginx:
   ```
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. Set up PM2 to manage the Node.js process:
   ```
   sudo npm install -g pm2
   cd /home/opc/skillswap/backend
   pm2 start server.js --name skillswap
   pm2 startup
   pm2 save
   ```

## Step 7: Set Up the Database Schema

1. Extract the wallet file you downloaded earlier:
   ```
   mkdir -p ~/wallet
   unzip ~/path/to/wallet.zip -d ~/wallet
   ```

2. Update the sqlnet.ora file:
   ```
   nano ~/wallet/sqlnet.ora
   ```
   Change the DIRECTORY path to the absolute path of your wallet directory.

3. Run the database schema script:
   ```
   cd /home/opc/skillswap/backend
   node -e "require('./config/db').initialize().then(() => { console.log('Connected to database'); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });"
   ```

4. If the connection is successful, you can run the SQL script to create the schema:
   ```
   sqlplus admin@skillswapdb_tp @models/database.sql
   ```

## Step 8: Configure HTTPS with Let's Encrypt (Optional)

For a production environment, it's recommended to secure your application with HTTPS:

1. Install Certbot:
   ```
   sudo dnf install -y certbot python3-certbot-nginx
   ```

2. Obtain and install a certificate:
   ```
   sudo certbot --nginx -d your-domain.com
   ```

3. Follow the prompts to complete the setup

## Step 9: Set Up Mobile App Deployment

For the Android app deployment:

1. Build the React Native app:
   ```
   cd /home/opc/skillswap/mobile
   npm install
   npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
   cd android
   ./gradlew assembleRelease
   ```

2. The APK file will be generated at:
   ```
   /home/opc/skillswap/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

3. You can distribute this APK file to users or upload it to the Google Play Store.

## Troubleshooting

### Database Connection Issues

- Verify that the wallet is correctly configured
- Check that the connection string, username, and password are correct in the .env file
- Ensure that the Oracle Instant Client is properly installed

### Application Not Starting

- Check the PM2 logs: `pm2 logs skillswap`
- Verify that all environment variables are correctly set
- Check that the database schema has been properly created

### Nginx Configuration Issues

- Check Nginx error logs: `sudo cat /var/log/nginx/error.log`
- Verify that the Nginx configuration is correct: `sudo nginx -t`
- Ensure that the firewall allows traffic on ports 80 and 443

## Monitoring and Maintenance

- Use PM2 to monitor the Node.js application: `pm2 monit`
- Set up regular backups of your database using Oracle's backup features
- Monitor your OCI resources through the Oracle Cloud Console

## Scaling (Beyond Free Tier)

When your application grows beyond the Free Tier limits, consider:

1. Upgrading to paid OCI resources
2. Implementing a load balancer for the web tier
3. Setting up auto-scaling for compute instances
4. Using a CDN for static content delivery

## Security Best Practices

1. Keep all software updated with the latest security patches
2. Use strong, unique passwords for all services
3. Implement rate limiting to prevent abuse
4. Regularly audit your OCI resources for security vulnerabilities
5. Enable logging and monitoring for all services

## Additional Resources

- [Oracle Cloud Documentation](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Node.js Deployment Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [React Deployment](https://create-react-app.dev/docs/deployment/)
- [React Native Android Deployment](https://reactnative.dev/docs/signed-apk-android)