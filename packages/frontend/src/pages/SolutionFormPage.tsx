import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { catalogService } from '../services/catalog';
import { useToast } from '../components/Toast';
import { useApiError } from '../hooks/useApiError';
import { solutionSchema, SolutionFormData } from '../schemas/validation';
import { Solution } from '../types/solution';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus, 
  Eye, 
  Save, 
  Loader2,
  Image as ImageIcon,
  FileText,
  DollarSign,
  Tag,
  Settings
} from 'lucide-react';

const SolutionFormPage: React.FC = () => {
  const { solutionId } = useParams<{ solutionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const { executeWithErrorHandling, isLoading } = useApiError();
  
  const [existingSolution, setExistingSolution] = useState<Solution | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const isEditing = !!solutionId;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<SolutionFormData>({
    resolver: zodResolver(solutionSchema),
    defaultValues: {
      pricing: {
        type: 'upfront',
        currency: 'INR'
      },
      features: [''],
      tags: ['']
    }
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control,
    name: 'features'
  });

  const { fields: tagFields, append: appendTag, remove: removeTag } = useFieldArray({
    control,
    name: 'tags'
  });

  const watchedPricingType = watch('pricing.type');

  useEffect(() => {
    if (isEditing && solutionId) {
      loadExistingSolution();
    }
  }, [solutionId, isEditing]);

  const loadExistingSolution = async () => {
    const solution = await executeWithErrorHandling(
      () => catalogService.getSolutionById(solutionId!),
      {
        onSuccess: (data) => {
          setExistingSolution(data);
          setUploadedImages(data.assets.images);
          
          // Populate form with existing data
          reset({
            name: data.name,
            description: data.description,
            category: data.category,
            pricing: {
              type: data.pricing.type,
              upfrontPrice: data.pricing.upfrontPrice,
              monthlyPrice: data.pricing.monthlyPrice,
              currency: data.pricing.currency
            },
            features: data.features || [''],
            tags: data.tags || [''],
            requirements: data.requirements || '',
            supportInfo: data.supportInfo || ''
          });
        },
        onError: (error) => showError('Failed to load solution', error.message)
      }
    );
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      showError('Invalid file type', 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showError('File too large', 'Please select an image smaller than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const imageUrl = await executeWithErrorHandling(
        () => catalogService.uploadImage(formData),
        {
          onSuccess: (url) => {
            setUploadedImages(prev => [...prev, url]);
            success('Image uploaded successfully');
          },
          onError: (error) => showError('Upload failed', error.message)
        }
      );
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: SolutionFormData) => {
    if (uploadedImages.length === 0) {
      showError('Images required', 'Please upload at least one image for your solution');
      return;
    }

    setIsSubmitting(true);

    const solutionData = {
      ...data,
      partnerId: user!.userId,
      partnerName: user!.name || user!.email,
      assets: {
        images: uploadedImages,
        documents: []
      },
      status: 'pending',
      createdAt: existingSolution?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const apiCall = isEditing
      ? () => catalogService.updateSolution(solutionId!, solutionData)
      : () => catalogService.createSolution(solutionData);

    await executeWithErrorHandling(apiCall, {
      onSuccess: () => {
        success(
          isEditing ? 'Solution updated successfully' : 'Solution created successfully',
          'Your solution has been submitted for review'
        );
        navigate('/partner/solutions');
      },
      onError: (error) => {
        showError('Failed to save solution', error.message);
        setIsSubmitting(false);
      }
    });
  };

  const categories = [
    'Business Software',
    'Development Tools',
    'Marketing & Sales',
    'Analytics & Data',
    'Communication',
    'E-commerce',
    'Security',
    'Productivity',
    'Design & Creative',
    'Education'
  ];

  if (isLoading && isEditing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading solution...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/partner/solutions')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Solutions
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Solution' : 'Create New Solution'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isEditing ? 'Update your solution details' : 'Add a new solution to the marketplace'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setPreviewMode(!previewMode)}
                className="btn-outline flex items-center"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </button>
            </div>
          </div>
        </div>

        {previewMode ? (
          /* Preview Mode */
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-3">
                {watch('category') || 'Category'}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {watch('name') || 'Solution Name'}
              </h2>
              <p className="text-gray-600 mb-6">
                {watch('description') || 'Solution description will appear here...'}
              </p>
            </div>

            {uploadedImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {uploadedImages.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {watch('features')?.filter(f => f.trim()).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
                    <div className="space-y-2">
                      {watch('features')?.filter(f => f.trim()).map((feature, index) => (
                        <div key={index} className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{watchedPricingType === 'upfront' 
                        ? (watch('pricing.upfrontPrice') || 0).toLocaleString()
                        : (watch('pricing.monthlyPrice') || 0).toLocaleString()
                      }
                      {watchedPricingType === 'subscription' && '/month'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {watchedPricingType === 'subscription' ? 'Monthly subscription' : 'One-time purchase'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Solution Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter solution name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your solution, its benefits, and key features..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <ImageIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Images & Screenshots</h2>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Images *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Click to upload images or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </label>
                </div>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-6">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pricing Model *
                  </label>
                  <select
                    {...register('pricing.type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="upfront">One-time Purchase</option>
                    <option value="subscription">Monthly Subscription</option>
                  </select>
                </div>

                {watchedPricingType === 'upfront' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) *
                    </label>
                    <input
                      {...register('pricing.upfrontPrice', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    {errors.pricing?.upfrontPrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.pricing.upfrontPrice.message}</p>
                    )}
                  </div>
                )}

                {watchedPricingType === 'subscription' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Price (₹) *
                    </label>
                    <input
                      {...register('pricing.monthlyPrice', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    {errors.pricing?.monthlyPrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.pricing.monthlyPrice.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Settings className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Features</h2>
                </div>
                <button
                  type="button"
                  onClick={() => appendFeature('')}
                  className="btn-outline btn-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Feature
                </button>
              </div>

              <div className="space-y-3">
                {featureFields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-3">
                    <input
                      {...register(`features.${index}`)}
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter a key feature"
                    />
                    {featureFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.features && (
                <p className="mt-2 text-sm text-red-600">{errors.features.message}</p>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Tag className="h-5 w-5 text-gray-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
                </div>
                <button
                  type="button"
                  onClick={() => appendTag('')}
                  className="btn-outline btn-sm flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tag
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tagFields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-3">
                    <input
                      {...register(`tags.${index}`)}
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter a tag"
                    />
                    {tagFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Requirements
                  </label>
                  <textarea
                    {...register('requirements')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe system requirements, compatibility, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Information
                  </label>
                  <textarea
                    {...register('supportInfo')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe support options, documentation, training, etc."
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={() => navigate('/partner/solutions')}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Solution' : 'Create Solution'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SolutionFormPage;