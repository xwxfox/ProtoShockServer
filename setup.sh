# fuck you i cant be bothered to write anything cool
npm install drizzle-kit turbo
<<<<<<< HEAD
rm -rf shared/drizzle/
=======
>>>>>>> 1de386b7c3cfd8d0b385038b6214d0958a137c41
cd packages/database
npm run migrate
cd ../../
echo "You should be able to build and run the server now."
echo "Try: npm run build <--- to build the server"
echo "Then: npm run start <--- to start the server"
echo "Please make sure to set the environment vars in each app's .env.production / .env.development file."
echo "If confused, check the readme file :3"