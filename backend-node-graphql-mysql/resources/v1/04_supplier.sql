CREATE TABLE suppliers (
	id INT AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	address_id INT NOT NULL,
	created_at DATETIME DEFAULT NOW(),
	updated_at DATETIME NULL on UPDATE NOW(),
	deleted_at DATETIME,
	CONSTRAINT suppliers_address_id FOREIGN KEY (address_id) REFERENCES addresses (id),
	INDEX(name)
);