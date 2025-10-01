import logging
from paystackapi.paystack import Paystack
from paystackapi.transaction import Transaction as PaystackTransaction
from paystackapi.customer import Customer as PaystackCustomer
from ..models.paystack_config import PaystackConfig

logger = logging.getLogger(__name__)

class PaystackService:
    def __init__(self):
        self.config = None
        self.paystack = None

    def _load_config(self):
        if not self.config:
            # Will only query DB when needed
            self.config, _ = PaystackConfig.objects.get_or_create(pk=1)
        return self.config

    def _get_paystack(self):
        if not self.paystack:
            config = self._load_config()
            self.paystack = Paystack(secret_key=config.secret_key)
        return self.paystack

    def initialize_payment(self, email, amount, reference, callback_url, metadata=None):
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
        try:
            response = PaystackTransaction.verify(reference)
            return response
        except Exception as e:
            logger.error(f"Error verifying Paystack payment: {str(e)}")
            raise

    def create_customer(self, email, first_name=None, last_name=None, phone=None):
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

# Singleton instance (safe now)
paystack_service = PaystackService()
