import logging
from django.conf import settings
from paystackapi.paystack import Paystack
from paystackapi.transaction import Transaction as PaystackTransaction
from paystackapi.customer import Customer as PaystackCustomer
from ..models.paystack_config import PaystackConfig

logger = logging.getLogger(__name__)

class PaystackService:
    def __init__(self):
        self.config = PaystackConfig.get_solo()
        self.paystack = Paystack(secret_key=self.config.secret_key)

    def initialize_payment(self, email, amount, reference, callback_url, metadata=None):
        """
        Initialize a Paystack payment
        
        Args:
            email (str): Customer's email
            amount (int): Amount in kobo (smallest currency unit)
            reference (str): Unique reference for the transaction
            callback_url (str): URL to redirect to after payment
            metadata (dict, optional): Additional metadata
            
        Returns:
            dict: Paystack API response
        """
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
        """
        Verify a Paystack payment
        
        Args:
            reference (str): Transaction reference
            
        Returns:
            dict: Payment verification response
        """
        try:
            response = PaystackTransaction.verify(reference)
            return response
        except Exception as e:
            logger.error(f"Error verifying Paystack payment: {str(e)}")
            raise

    def create_customer(self, email, first_name=None, last_name=None, phone=None):
        """
        Create a Paystack customer
        
        Args:
            email (str): Customer's email
            first_name (str, optional): Customer's first name
            last_name (str, optional): Customer's last name
            phone (str, optional): Customer's phone number
            
        Returns:
            dict: Paystack customer data
        """
        try:
            customer_data = {
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'phone': phone
            }
            # Remove None values
            customer_data = {k: v for k, v in customer_data.items() if v is not None}
            
            response = PaystackCustomer.create(**customer_data)
            return response
        except Exception as e:
            logger.error(f"Error creating Paystack customer: {str(e)}")
            raise

    def get_payment_link(self, amount, email, reference, callback_url, metadata=None):
        """
        Get a payment link for Paystack
        
        Args:
            amount (int): Amount in kobo (smallest currency unit)
            email (str): Customer's email
            reference (str): Unique reference for the transaction
            callback_url (str): URL to redirect to after payment
            metadata (dict, optional): Additional metadata
            
        Returns:
            str: Payment URL
        """
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
