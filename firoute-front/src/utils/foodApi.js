import axios from 'axios';

const FOOD_PRODUCT_API_URL = 'https://world.openfoodfacts.org/api/v0/product';

export async function getProductData(barcode) {
    try {
        const response = await axios.get(`${FOOD_PRODUCT_API_URL}/${barcode}.json`);
        return response.data;
    } catch (error) {
        console.error('Error fetching product data:', error);
        throw error;
    }
}