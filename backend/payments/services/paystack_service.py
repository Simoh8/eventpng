import logging
from django.conf import settings
from paystackapi.paystack import Paystack
from paystackapi.transaction import Transaction as PaystackTransaction
from paystackapi.customer import Customer as PaystackCustomer
from ..models.paystack_config import PaystackConfig

logger = logging.getLogger(__name__)

class PaystackService:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._config = None
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._initialized = True
            self.paystack = None

    @property
    def config(self):
        if self._config is None:
            try:
                self._config = PaystackConfig.get_solo()
                # Initialize Paystack with the config
                secret_key = self._config.live_secret_key if self._config.is_live else self._config.test_secret_key
                if not secret_key:
                    raise ValueError("Paystack secret key is not configured")
                self.paystack = Paystack(secret_key=secret_key)
            except Exception as e:
                logger.error(f"Error initializing Paystack config: {str(e)}")
                # Create a dummy config to prevent repeated errors
                self._config = PaystackConfig(
                    is_live=False,
                    test_secret_key='dummy_key',
                    live_secret_key='dummy_key'
                )
        return self._config

    def _ensure_initialized(self):
        """Ensure the service is properly initialized before making API calls"""
        if self.paystack is None:
            _ = self.config  # This will initialize the config and paystack client

    def initialize_payment(self, email, amount, reference, callback_url, metadata=None):
        """Initialize a Paystack payment"""
        self._ensure_initialized()
        try:
            response = PaystackTransaction.initialize(
                email=email,
                amount=amount,
                reference=reference,
                callback_url=callback_url,
                metadata=metadata or {}
            )
            return response
        except Exception as e:
            logger.error(f"Error initializing Paystack payment: {str(e)}")
            raise

    def verify_payment(self, reference):
        """Verify a Paystack payment"""
        self._ensure_initialized()
        try:
            response = PaystackTransaction.verify(reference)
            return response
        except Exception as e:
            logger.error(f"Error verifying Paystack payment: {str(e)}")
            raise

    def create_customer(self, email, first_name=None, last_name=None, phone=None):
        """Create a Paystack customer"""
        self._ensure_initialized()
        try:
            customer_data = {
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'phone': phone
            }
            customer_data = {k: v for k, v in customer_data.items() if v is not None}
            response = PaystackCustomer.create(**customer_data)
            return response
        except Exception as e:
            logger.error(f"Error creating Paystack customer: {str(e)}")
            raise

    def get_payment_link(self, amount, email, reference, callback_url, metadata=None):
        """Get a payment link for Paystack"""
        try:
            response = self.initialize_payment(
                email=email,
                amount=amount,
                reference=reference,
                callback_url=callback_url,
                metadata=metadata or {}
            )
            return response.get('data', {}).get('authorization_url')
        except Exception as e:
            logger.error(f"Error getting Paystack payment link: {str(e)}")
            raise

# Create a singleton instance
paystack_service = PaystackService()