# Cloud-Computing--Iaas
sudo apt install nodejs
sudo apt install npm
sudo apt install build-essential
sudo npm install -g express
npm link express
sudo npm install -g multer
npm link multer
sudo apt  install awscli

python workload_generator.py --num_request 1 --url 'http://52.87.178.135:3000' --image_folder "images"

10.157.140.223
python workload_generator.py --num_request 1 --url http://10.157.140.223:3000 --image_folder "images/"