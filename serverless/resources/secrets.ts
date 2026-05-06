export const secretsResources = {
    AuthPepperSecret: {
        Type: "AWS::SecretsManager::Secret",
        Properties: {
            Name: "${self:service}/${self:provider.stage}/auth/pepper",
            Description:
                "HMAC pepper applied before argon2id when hashing user passwords",
            GenerateSecretString: {
                PasswordLength: 64,
                ExcludePunctuation: true,
            },
        },
    },
    AuthJwtSigningKeySecret: {
        Type: "AWS::SecretsManager::Secret",
        Properties: {
            Name: "${self:service}/${self:provider.stage}/auth/jwt-signing-key",
            Description:
                "HMAC signing key for HS256 JWT access tokens",
            GenerateSecretString: {
                PasswordLength: 64,
                ExcludePunctuation: true,
            },
        },
    },
};
