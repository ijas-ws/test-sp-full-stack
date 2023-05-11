CREATE TABLE addresses (
	id INT AUTO_INCREMENT PRIMARY KEY,
	address_1 VARCHAR(255) NOT NULL,
	address_2 VARCHAR(255) NOT NULL,
	city VARCHAR(255) NOT NULL,
	country VARCHAR(255) NOT NULL,
	latitude FLOAT NOT NULL,
	longitude FLOAT NOT NULL,
	created_at DATETIME DEFAULT NOW(),
	updated_at DATETIME NULL on UPDATE NOW(),
	deleted_at DATETIME,
	INDEX(latitude),
	INDEX(longitude)
);