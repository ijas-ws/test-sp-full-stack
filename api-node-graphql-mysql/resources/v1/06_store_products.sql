CREATE TABLE store_products (
	id INT AUTO_INCREMENT PRIMARY KEY,
	product_id INT NOT NULL,
	store_id INT NOT NULL,
	created_at DATETIME DEFAULT NOW(),
	updated_at DATETIME NULL on UPDATE NOW(),
	deleted_at DATETIME,
	CONSTRAINT store_products_product_id FOREIGN KEY (product_id) REFERENCES products (id),
	CONSTRAINT store_products_store_id FOREIGN KEY (store_id) REFERENCES stores (id)
);