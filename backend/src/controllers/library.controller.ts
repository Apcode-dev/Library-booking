import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Helper: Haversine distance in kilometers
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

export class LibraryController {
  /**
   * Search and filter libraries with location, facilities, and pricing
   */
  static async getLibraries(req: Request, res: Response): Promise<void> {
    try {
      const {
        search,
        address,
        city,
        district,
        state,
        pincode,
        facility,
        maxPrice,
        minRating,
        userLat,
        userLng,
        maxDistanceKm,
      } = req.query;

      // Only fetch APPROVED libraries for public seekers
      const whereClause: any = {
        status: 'APPROVED',
      };

      if (maxPrice && !isNaN(Number(maxPrice))) {
        whereClause.hourlyRate = { lte: Number(maxPrice) };
      }

      const libraries = await prisma.library.findMany({
        where: whereClause,
        include: {
          reviews: {
            select: { rating: true },
          },
          seatZones: {
            include: {
              seats: {
                select: { id: true, isAvailable: true },
              },
            },
          },
          _count: {
            select: { seats: true, bookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform and compute ratings & distance
      let formatted = libraries.map((lib) => {
        const photos = JSON.parse(lib.photos || '[]');
        const facilities = JSON.parse(lib.facilities || '[]');

        const totalRatings = lib.reviews.length;
        const avgRating =
          totalRatings > 0
            ? parseFloat(
                (
                  lib.reviews.reduce((acc, r) => acc + r.rating, 0) / totalRatings
                ).toFixed(1)
              )
            : 4.8; // default positive baseline

        let distanceKm: number | null = null;
        if (userLat && userLng) {
          distanceKm = calculateHaversineDistance(
            Number(userLat),
            Number(userLng),
            lib.latitude,
            lib.longitude
          );
        }

        const totalAvailableSeats = lib.seatZones.reduce((acc, zone) => {
          return acc + zone.seats.filter((s) => s.isAvailable).length;
        }, 0);

        return {
          id: lib.id,
          name: lib.name,
          slug: lib.slug,
          tagline: lib.tagline,
          description: lib.description,
          address: lib.address,
          city: lib.city,
          district: lib.district || '',
          state: lib.state,
          pincode: lib.pincode,
          latitude: lib.latitude,
          longitude: lib.longitude,
          photos,
          bannerImage: lib.bannerImage || photos[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000',
          interiorImage: lib.interiorImage || photos[1] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000',
          amenitiesImage: lib.amenitiesImage || photos[2] || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000',
          facilities,
          hourlyRate: lib.hourlyRate,
          dailyRate: lib.dailyRate,
          monthlyRate: lib.monthlyRate,
          yearlyRate: lib.yearlyRate,
          enableMembership: lib.enableMembership,
          enableMonthly: lib.enableMonthly,
          monthlyDetails: lib.monthlyDetails,
          enableYearly: lib.enableYearly,
          yearlyDetails: lib.yearlyDetails,
          taxPercent: lib.taxPercent,
          serviceFee: lib.serviceFee,
          extraChargesDesc: lib.extraChargesDesc,
          hourlySeats: lib.hourlySeats,
          monthlySeats: lib.monthlySeats,
          yearlySeats: lib.yearlySeats,
          openingTime: lib.openingTime,
          closingTime: lib.closingTime,
          totalSeats: lib.totalSeats || lib._count.seats,
          availableSeats: totalAvailableSeats,
          rating: avgRating,
          reviewCount: totalRatings,
          distanceKm,
        };
      });

      // =========================================================================
      // LINE-BY-LINE HIERARCHICAL FILTERING (State -> District -> City/Pincode -> Address)
      // =========================================================================

      // Step 1: Check State
      const qState = typeof state === 'string' && state !== 'All' ? state.trim().toLowerCase() : '';
      if (qState) {
        const stateMatches = formatted.filter((l) => l.state.toLowerCase().includes(qState));
        if (stateMatches.length > 0) {
          formatted = stateMatches;
        }
      }

      // Step 2: Check District
      const qDistrict = typeof district === 'string' ? district.trim().toLowerCase() : '';
      if (qDistrict) {
        const districtMatches = formatted.filter(
          (l) => l.district && l.district.toLowerCase().includes(qDistrict)
        );
        if (districtMatches.length > 0) {
          formatted = districtMatches;
        }
      }

      // Step 3: Check City & Pincode
      const qCity = typeof city === 'string' && city !== 'All' ? city.trim().toLowerCase() : '';
      const qPincode = typeof pincode === 'string' ? pincode.trim().toLowerCase() : '';

      if (qCity || qPincode) {
        const cityPincodeMatches = formatted.filter((l) => {
          const matchCity = qCity ? l.city.toLowerCase().includes(qCity) : true;
          const matchPin = qPincode ? l.pincode.toLowerCase().includes(qPincode) : true;
          return matchCity && matchPin;
        });
        if (cityPincodeMatches.length > 0) {
          formatted = cityPincodeMatches;
        }
      }

      // Step 4: Check Address & Keyword Search
      const qAddress = typeof address === 'string' ? address.trim().toLowerCase() : '';
      const qSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';

      if (qAddress) {
        const addressMatches = formatted.filter((l) => l.address.toLowerCase().includes(qAddress));
        if (addressMatches.length > 0) {
          formatted = addressMatches;
        }
      }

      if (qSearch) {
        const searchMatches = formatted.filter(
          (l) =>
            l.name.toLowerCase().includes(qSearch) ||
            l.address.toLowerCase().includes(qSearch) ||
            l.city.toLowerCase().includes(qSearch) ||
            (l.district && l.district.toLowerCase().includes(qSearch)) ||
            l.state.toLowerCase().includes(qSearch) ||
            l.pincode.toLowerCase().includes(qSearch) ||
            l.description.toLowerCase().includes(qSearch)
        );
        if (searchMatches.length > 0) {
          formatted = searchMatches;
        }
      }

      if (facility && typeof facility === 'string') {
        const requiredFacilities = facility
          .split(',')
          .map((f) => f.trim().toLowerCase())
          .filter(Boolean);

        if (requiredFacilities.length > 0) {
          formatted = formatted.filter((l) =>
            requiredFacilities.every((rf) =>
              l.facilities.some((f: string) => {
                const lowerF = f.toLowerCase();
                return lowerF.includes(rf) || rf.includes(lowerF);
              })
            )
          );
        }
      }

      if (minRating && !isNaN(Number(minRating))) {
        formatted = formatted.filter((l) => l.rating >= Number(minRating));
      }

      if (maxDistanceKm && !isNaN(Number(maxDistanceKm))) {
        formatted = formatted.filter(
          (l) => l.distanceKm !== null && l.distanceKm <= Number(maxDistanceKm)
        );
      }

      // If user provided coordinates, sort by nearest first
      if (userLat && userLng) {
        formatted.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
      }

      res.json({
        success: true,
        count: formatted.length,
        libraries: formatted,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch libraries', error: error.message });
    }
  }

  /**
   * Get single library details by ID or Slug with zones, seats, reviews
   */
  static async getLibraryByIdOrSlug(req: Request, res: Response): Promise<void> {
    try {
      const { idOrSlug } = req.params;
      const cleanParam = idOrSlug.trim();

      const library = await prisma.library.findFirst({
        where: {
          OR: [
            { id: cleanParam },
            { slug: cleanParam },
            { slug: { startsWith: cleanParam } },
            { slug: { contains: cleanParam } },
            { name: { contains: cleanParam } },
          ],
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true },
          },
          seatZones: {
            include: {
              seats: {
                orderBy: { seatNumber: 'asc' },
              },
            },
          },
          reviews: {
            include: {
              user: {
                select: { name: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!library) {
        res.status(404).json({ success: false, message: 'Library not found' });
        return;
      }

      const rawPhotos = JSON.parse(library.photos || '[]');
      const facilities = JSON.parse(library.facilities || '[]');

      const banner = library.bannerImage || rawPhotos[0] || 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000';
      const interior = library.interiorImage || rawPhotos[1] || 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000';
      const amenities = library.amenitiesImage || rawPhotos[2] || 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000';
      const photos = [banner, interior, amenities];

      const avgRating =
        library.reviews.length > 0
          ? parseFloat(
              (
                library.reviews.reduce((acc, r) => acc + r.rating, 0) /
                library.reviews.length
              ).toFixed(1)
            )
          : 4.8;

      res.json({
        success: true,
        library: {
          ...library,
          photos,
          bannerImage: banner,
          interiorImage: interior,
          amenitiesImage: amenities,
          facilities,
          rating: avgRating,
          reviewCount: library.reviews.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to fetch library', error: error.message });
    }
  }

  /**
   * Add a review for a library
   */
  static async addReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user!.id;

      if (!rating || !comment) {
        res.status(400).json({ success: false, message: 'Rating (1-5) and comment are required.' });
        return;
      }

      const review = await prisma.review.create({
        data: {
          rating: Number(rating),
          comment,
          libraryId: id,
          userId,
        },
        include: {
          user: { select: { name: true, avatar: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Review posted successfully!',
        review,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Failed to add review', error: error.message });
    }
  }
}
