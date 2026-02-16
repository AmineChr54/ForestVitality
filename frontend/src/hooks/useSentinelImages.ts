// Sentinel Images Hook - Mock Implementation
// TODO: F2 should replace with React Query implementation

import { useState, useCallback } from 'react';
import type { SentinelImage, SentinelQueryParams } from '../types/vitality';

// Mock sentinel images
const MOCK_IMAGES: SentinelImage[] = [
    {
        id: 'S2A_20240615_T32UPU',
        date: '2024-06-15',
        cloudCover: 5.2,
        coverage: 100,
        provider: 'Copernicus',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Sentinel+1',
    },
    {
        id: 'S2B_20240610_T32UPU',
        date: '2024-06-10',
        cloudCover: 12.8,
        coverage: 95,
        provider: 'Copernicus',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Sentinel+2',
    },
    {
        id: 'S2A_20240605_T32UPU',
        date: '2024-06-05',
        cloudCover: 8.5,
        coverage: 100,
        provider: 'Copernicus',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Sentinel+3',
    },
    {
        id: 'S2B_20240601_T32UPU',
        date: '2024-06-01',
        cloudCover: 22.1,
        coverage: 88,
        provider: 'Copernicus',
        thumbnailUrl: 'https://via.placeholder.com/200x200?text=Sentinel+4',
    },
];

interface UseSentinelImagesReturn {
    images: SentinelImage[];
    isLoading: boolean;
    error: string | null;
    fetchImages: (params: SentinelQueryParams) => Promise<SentinelImage[]>;
    selectedImage: SentinelImage | null;
    selectImage: (imageId: string | null) => void;
}

export const useSentinelImages = (): UseSentinelImagesReturn => {
    const [images, setImages] = useState<SentinelImage[]>(MOCK_IMAGES);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

    const selectedImage = images.find((img) => img.id === selectedImageId) || null;

    const fetchImages = useCallback(async (params: SentinelQueryParams): Promise<SentinelImage[]> => {
        setIsLoading(true);
        setError(null);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 600));

        // Filter mock images based on params
        let filteredImages = [...MOCK_IMAGES];

        if (params.cloudCoverMax !== undefined) {
            filteredImages = filteredImages.filter((img) => img.cloudCover <= params.cloudCoverMax!);
        }

        if (params.limit) {
            filteredImages = filteredImages.slice(0, params.limit);
        }

        setImages(filteredImages);
        setIsLoading(false);
        return filteredImages;
    }, []);

    const selectImage = useCallback((imageId: string | null) => {
        setSelectedImageId(imageId);
    }, []);

    return {
        images,
        isLoading,
        error,
        fetchImages,
        selectedImage,
        selectImage,
    };
};
