<?php
// models/User.php
class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $username;
    public $password;
    public $role;
    public $is_active;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function login() {
        $query = "SELECT id, username, password, role FROM " . $this->table_name . 
                 " WHERE username = :username AND is_active = 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':username', $this->username);
        $stmt->execute();

        if($stmt->rowCount() > 0) {
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if(password_verify($this->password, $row['password'])) {
                return $row;
            }
        }
        return false;
    }

    public function create() {
        $query = "INSERT INTO " . $this->table_name . 
                 " SET username=:username, password=:password, role=:role";
        $stmt = $this->conn->prepare($query);
        
        $this->password = password_hash($this->password, PASSWORD_DEFAULT);
        
        $stmt->bindParam(':username', $this->username);
        $stmt->bindParam(':password', $this->password);
        $stmt->bindParam(':role', $this->role);
        
        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function getAll() {
        $query = "SELECT id, username, role, is_active, created_at FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function update() {
        $query = "UPDATE " . $this->table_name . 
                 " SET role = :role";
        
        if(!empty($this->password)) {
            $query .= ", password = :password";
        }
        
        $query .= " WHERE id = :id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':role', $this->role);
        $stmt->bindParam(':id', $this->id);
        
        if(!empty($this->password)) {
            $this->password = password_hash($this->password, PASSWORD_DEFAULT);
            $stmt->bindParam(':password', $this->password);
        }
        
        if($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $this->id);
        
        if($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>