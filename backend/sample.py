from app.core.security import hash_password

print("recruiter:", hash_password("recruiter123"))
print("candidate:", hash_password("candidate123"))