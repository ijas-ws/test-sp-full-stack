CREATE TABLE supplier_products (
	id INT AUTO_INCREMENT PRIMARY KEY,
	product_id INT NOT NULL,
	supplier_id INT NOT NULL,
	created_at DATETIME DEFAULT NOW(),
	updated_at DATETIME NULL on UPDATE NOW(),
	deleted_at DATETIME,
	CONSTRAINT suppliers_product_products_id FOREIGN KEY (product_id) REFERENCES products (id),
	CONSTRAINT suppliers_product_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);