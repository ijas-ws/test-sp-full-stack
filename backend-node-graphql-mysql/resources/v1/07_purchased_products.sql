CREATE TABLE purchased_products (
	id INT AUTO_INCREMENT PRIMARY KEY,
	product_id INT NOT NULL,
	price INT NOT NULL,
	discount INT NOT NULL,
	store_id INT NOT NULL,
	delivery_date DATETIME NOT NULL,
	created_at DATETIME DEFAULT NOW(),
	updated_at DATETIME NULL on UPDATE NOW(),
	deleted_at DATETIME,
	CONSTRAINT purchased_products_product_id FOREIGN KEY (product_id) REFERENCES products (id),
	CONSTRAINT purchased_products_store_id FOREIGN KEY (store_id) REFERENCES stores (id),
	INDEX(delivery_date),
	INDEX(store_id)
);